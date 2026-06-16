"""Closed-loop MPC runner: NMPC optimises over a prediction model; the optimal
first control action is applied to a separate plant model each step."""
import asyncio
import math
from typing import Callable, Awaitable

import numpy as np
from hilo_mpc import NMPC

from api.models.mpc import MpcRequest
from api.models.block import PlantBlockConfig
from core.model_builder import build_model
from core.simulation_runner import _extract_latest


# ── Measurement function ──────────────────────────────────────────────────────

def _build_measurement_fn(plant_cfg: PlantBlockConfig, state_names: list[str]):
    """Return a callable (x_vals) -> y_vals.

    If no measurement_expressions are defined, returns identity (y = x).
    Otherwise evaluates each expression as a Python expression in a namespace
    populated with the current state values and common math functions.
    """
    if not plant_cfg.measurement_expressions:
        return lambda x_vals: list(x_vals)

    # Safe math namespace
    _math_ns = {
        "sin": math.sin, "cos": math.cos, "tan": math.tan,
        "exp": math.exp, "log": math.log, "sqrt": math.sqrt,
        "abs": abs, "pi": math.pi, "e": math.e,
        "__builtins__": {},
    }
    exprs = plant_cfg.measurement_expressions

    def _evaluate(x_vals: list[float]) -> list[float]:
        ns = dict(zip(state_names, x_vals))
        ns.update(_math_ns)
        return [float(eval(expr, {"__builtins__": {}}, ns)) for expr in exprs]

    return _evaluate


# ── Main runner ───────────────────────────────────────────────────────────────

async def run_mpc(
    req: MpcRequest,
    send_frame: Callable[[dict], Awaitable[None]],
) -> None:
    mpc_cfg = req.mpc_block

    # ── 1. Build prediction model and NMPC ───────────────────────────────────
    pred_model = build_model(req.model_block)
    pred_model.setup(dt=mpc_cfg.dt, integrator="rk4")

    pred_state_names = [s.name for s in req.model_block.states if s.name.strip()]
    input_names = [i.name for i in req.model_block.inputs if i.name.strip()]
    n_inputs = len(input_names)

    if not pred_state_names:
        raise ValueError("Prediction model has no states. Add at least one state in the Model block.")
    if len(pred_state_names) != len(req.model_block.ode_expressions):
        raise ValueError(
            f"Model state count ({len(pred_state_names)}) does not match ODE expression count "
            f"({len(req.model_block.ode_expressions)}). Ensure each state has an ODE."
        )

    nmpc = NMPC(pred_model)
    nmpc.horizon = mpc_cfg.horizon

    # Quadratic stage cost: states
    q_weights = [mpc_cfg.state_weights.get(n, 1.0) for n in pred_state_names]
    x_ref = [mpc_cfg.state_ref.get(n, 0.0) for n in pred_state_names]
    nmpc.quad_stage_cost.add_states(names=pred_state_names, weights=q_weights, ref=x_ref)

    # Quadratic stage cost: inputs
    if input_names:
        r_weights = [mpc_cfg.input_weights.get(n, 0.1) for n in input_names]
        u_ref = [mpc_cfg.input_ref.get(n, 0.0) for n in input_names]
        nmpc.quad_stage_cost.add_inputs(names=input_names, weights=r_weights, ref=u_ref)

    # Box constraints
    _BIG = 1e9
    x_lb_vals = [mpc_cfg.state_lb.get(n) for n in pred_state_names]
    x_ub_vals = [mpc_cfg.state_ub.get(n) for n in pred_state_names]
    u_lb_vals = [mpc_cfg.input_lb.get(n) for n in input_names]
    u_ub_vals = [mpc_cfg.input_ub.get(n) for n in input_names]

    constraint_kwargs: dict = {}
    if any(v is not None for v in x_lb_vals):
        constraint_kwargs["x_lb"] = [v if v is not None else -_BIG for v in x_lb_vals]
    if any(v is not None for v in x_ub_vals):
        constraint_kwargs["x_ub"] = [v if v is not None else _BIG for v in x_ub_vals]
    if input_names and any(v is not None for v in u_lb_vals):
        constraint_kwargs["u_lb"] = [v if v is not None else -_BIG for v in u_lb_vals]
    if input_names and any(v is not None for v in u_ub_vals):
        constraint_kwargs["u_ub"] = [v if v is not None else _BIG for v in u_ub_vals]
    if constraint_kwargs:
        nmpc.set_box_constraints(**constraint_kwargs)

    nmpc.setup()

    x0_pred = [mpc_cfg.initial_conditions.get(s, 0.0) for s in pred_state_names]
    u0 = [0.0] * n_inputs
    nmpc.set_initial_guess(x0_pred, u0)

    pred_param_values = [p.value for p in req.model_block.parameters if p.name.strip()]

    # ── 2. Build plant model ──────────────────────────────────────────────────
    plant_cfg = req.plant_block
    # Strip measurement expressions: we evaluate them ourselves via _build_measurement_fn,
    # so there is no need (and no benefit) to pass them to hilo-mpc's parser.
    from copy import copy as _copy
    plant_cfg_no_meas = _copy(plant_cfg)
    plant_cfg_no_meas.measurement_expressions = []
    plant_model = build_model(plant_cfg_no_meas)
    plant_model.setup(dt=mpc_cfg.dt, integrator="rk4")

    plant_state_names = [s.name for s in plant_cfg.states]
    x0_plant = [mpc_cfg.initial_conditions.get(s, 0.0) for s in plant_state_names]
    plant_model.set_initial_conditions(x0=x0_plant)

    param_values = [p.value for p in plant_cfg.parameters if p.name.strip()]

    # Measurement function: y = h(x_plant)
    measure = _build_measurement_fn(plant_cfg, plant_state_names)

    # ── 3. Closed-loop simulation ─────────────────────────────────────────────
    n_steps = max(1, int(round(mpc_cfg.t_end / mpc_cfg.dt)))
    x_plant_vals = list(x0_plant)

    for k in range(n_steps):
        # Compute measurement (used as x0 for NMPC — assumes same dimension as pred states)
        y = measure(x_plant_vals)

        # Pad or truncate y to match prediction model state dimension
        n_pred = len(pred_state_names)
        if len(y) < n_pred:
            y = y + [0.0] * (n_pred - len(y))
        elif len(y) > n_pred:
            y = y[:n_pred]

        # MPC optimisation
        optimize_kwargs: dict = {"x0": y}
        if pred_param_values:
            optimize_kwargs["cp"] = pred_param_values
        u_opt = nmpc.optimize(**optimize_kwargs)
        u_flat = list(np.array(u_opt).flatten())
        u_first = u_flat[:n_inputs]

        # Apply first control action to plant
        if n_inputs > 0 and param_values:
            plant_model.simulate(u=u_first, p=param_values)
        elif n_inputs > 0:
            plant_model.simulate(u=u_first)
        elif param_values:
            plant_model.simulate(p=param_values)
        else:
            plant_model.simulate()

        x_plant_vals = list(_extract_latest(plant_model, plant_state_names).values())

        # Build values dict: plant states + applied inputs + measurements
        values: dict[str, float] = dict(zip(plant_state_names, x_plant_vals))
        for i, name in enumerate(input_names):
            values[name] = u_first[i] if i < len(u_first) else 0.0

        # Add named measurements if custom measurement equations are defined
        if plant_cfg.measurement_names:
            y_vals = measure(x_plant_vals)
            for i, mname in enumerate(plant_cfg.measurement_names):
                if mname.strip():
                    values[mname] = y_vals[i] if i < len(y_vals) else 0.0

        t_result = round((k + 1) * mpc_cfg.dt, 10)
        await send_frame({"type": "step", "t": t_result, "values": values})
        await asyncio.sleep(0)  # yield so WS frames flush
