"""Online MHE-MPC closed-loop runner.

Each timestep:
  1. Compute measurement y = h(x_plant) from the plant
  2. Feed y to MHE, get state estimate x_hat
  3. Use x_hat (or x0 fallback before MHE has full horizon) as initial condition for NMPC
  4. Optimize → extract first control action u*
  5. Apply u* to plant
  6. Stream: estimated states + applied inputs

The same model is used for both NMPC prediction and MHE estimation.
"""
import asyncio
import math
from typing import Callable, Awaitable

import numpy as np
from hilo_mpc import NMPC, MHE

from api.models.mhe_mpc import MheMpcRequest
from api.models.block import PlantBlockConfig
from core.model_builder import build_model
from core.simulation_runner import _extract_latest


# ── Measurement function ──────────────────────────────────────────────────────

def _build_measurement_fn(plant_cfg: PlantBlockConfig, state_names: list[str]):
    """Return a callable (x_vals) -> y_vals.  y = x if no expressions defined."""
    if not plant_cfg.measurement_expressions:
        return lambda x_vals: list(x_vals)

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
        return [float(eval(expr, {"__builtins__": {}}, ns)) for expr in exprs]  # noqa: S307

    return _evaluate


# ── Main runner ───────────────────────────────────────────────────────────────

async def run_mhe_mpc(
    req: MheMpcRequest,
    send_frame: Callable[[dict], Awaitable[None]],
) -> None:
    mpc_cfg = req.mpc_block
    mhe_cfg = req.mhe_block

    # ── 1. Build prediction model + NMPC ────────────────────────────────────
    pred_model = build_model(req.model_block)
    pred_model.setup(dt=mpc_cfg.dt, integrator="rk4")

    pred_state_names = [s.name for s in req.model_block.states]
    input_names = [i.name for i in req.model_block.inputs]
    n_inputs = len(input_names)

    nmpc = NMPC(pred_model)
    nmpc.horizon = mpc_cfg.horizon

    q_weights = [mpc_cfg.state_weights.get(n, 1.0) for n in pred_state_names]
    x_ref = [mpc_cfg.state_ref.get(n, 0.0) for n in pred_state_names]
    nmpc.quad_stage_cost.add_states(names=pred_state_names, weights=q_weights, ref=x_ref)

    if input_names:
        r_weights = [mpc_cfg.input_weights.get(n, 0.1) for n in input_names]
        u_ref = [mpc_cfg.input_ref.get(n, 0.0) for n in input_names]
        nmpc.quad_stage_cost.add_inputs(names=input_names, weights=r_weights, ref=u_ref)

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

    # ── 2. Build estimator model + MHE ────────────────────────────────────────
    est_model = build_model(req.model_block)
    est_model.setup(dt=mhe_cfg.dt, integrator="rk4")

    mhe = MHE(est_model)
    mhe.horizon = mhe_cfg.horizon

    # Measurement names come from hilo-mpc internals
    meas_names_internal = est_model._y._names  # type: ignore[attr-defined]
    n_meas = len(meas_names_internal)
    user_meas_names = list(req.model_block.measurement_names)

    meas_weights = [
        mhe_cfg.measurement_noise.get(
            user_meas_names[i] if i < len(user_meas_names) else meas_names_internal[i],
            1.0,
        )
        for i in range(n_meas)
    ]
    mhe.quad_stage_cost.add_measurements(names=meas_names_internal, weights=meas_weights)

    proc_weights = [mhe_cfg.process_noise.get(n, 0.1) for n in pred_state_names]
    mhe.quad_stage_cost.add_state_noise(weights=proc_weights)

    arrival_weights = [mhe_cfg.arrival_cost.get(n, 1.0) for n in pred_state_names]
    initial_guess = [mhe_cfg.initial_guess.get(n, 0.0) for n in pred_state_names]
    mhe.quad_arrival_cost.add_states(weights=arrival_weights, guess=initial_guess)

    mhe.setup()

    # ── 3. Build plant model ──────────────────────────────────────────────────
    plant_cfg = req.plant_block
    # Build without measurement equations (we handle those via _build_measurement_fn)
    from copy import copy as _copy
    plant_cfg_no_meas = _copy(plant_cfg)
    plant_cfg_no_meas.measurement_expressions = []
    plant_model = build_model(plant_cfg_no_meas)
    plant_model.setup(dt=mpc_cfg.dt, integrator="rk4")

    plant_state_names = [s.name for s in plant_cfg.states]
    x0_plant = [mpc_cfg.initial_conditions.get(s, 0.0) for s in plant_state_names]
    plant_model.set_initial_conditions(x0=x0_plant)

    plant_param_values = [p.value for p in plant_cfg.parameters if p.name.strip()]

    # Measurement function y = h(x_plant)
    measure = _build_measurement_fn(plant_cfg, plant_state_names)

    # Determine how many plant measurements the MHE expects
    # If no measurement expressions on model: MHE uses full state (n_meas == n_pred_states)
    # If expressions defined: n_meas == len(measurement_expressions)

    # ── 4. Closed-loop online simulation ─────────────────────────────────────
    n_steps = max(1, int(round(mpc_cfg.t_end / mpc_cfg.dt)))
    x_plant_vals = list(x0_plant)
    u_last = [0.0] * n_inputs

    for k in range(n_steps):
        # --- 4a. Get measurement from plant ---
        y = measure(x_plant_vals)

        # Pad/truncate to match expected n_meas
        if len(y) < n_meas:
            y = y + [0.0] * (n_meas - len(y))
        elif len(y) > n_meas:
            y = y[:n_meas]

        # --- 4b. Feed measurement to MHE ---
        if n_inputs > 0:
            mhe.add_measurements(y_meas=y, u_meas=u_last)
        else:
            mhe.add_measurements(y_meas=y)
        x_hat_raw, _ = mhe.estimate()

        # x_hat is None until MHE has a full horizon of data
        if x_hat_raw is not None:
            x_hat = list(np.array(x_hat_raw).flatten())
        else:
            x_hat = None

        # --- 4c. Build x0 for NMPC ---
        # Use MHE estimate; fall back to current plant state (same dimension as pred model)
        if x_hat is not None:
            x0_nmpc = x_hat[:len(pred_state_names)]
        else:
            # Before MHE converges, use plant states directly (assumes same state space)
            x0_nmpc = x_plant_vals[:len(pred_state_names)]

        # --- 4d. NMPC optimization ---
        u_opt = nmpc.optimize(x0=x0_nmpc)
        u_flat = list(np.array(u_opt).flatten())
        u_first = u_flat[:n_inputs]
        u_last = u_first

        # --- 4e. Apply control to plant ---
        if n_inputs > 0 and plant_param_values:
            plant_model.simulate(u=u_first, p=plant_param_values)
        elif n_inputs > 0:
            plant_model.simulate(u=u_first)
        elif plant_param_values:
            plant_model.simulate(p=plant_param_values)
        else:
            plant_model.simulate()

        x_plant_vals = list(_extract_latest(plant_model, plant_state_names).values())

        # --- 4f. Stream results ---
        values: dict[str, float] = {}
        # MHE estimate (if available), otherwise plant states
        est_vals = x_hat if x_hat is not None else x_plant_vals[:len(pred_state_names)]
        for i, name in enumerate(pred_state_names):
            values[name] = est_vals[i] if i < len(est_vals) else 0.0
        # True plant states (prefixed to distinguish)
        for i, name in enumerate(plant_state_names):
            values[f"plant_{name}"] = x_plant_vals[i]
        # Applied inputs
        for i, name in enumerate(input_names):
            values[name] = u_first[i] if i < len(u_first) else 0.0

        t_result = round((k + 1) * mpc_cfg.dt, 10)
        await send_frame({"type": "step", "t": t_result, "values": values})
        await asyncio.sleep(0)
