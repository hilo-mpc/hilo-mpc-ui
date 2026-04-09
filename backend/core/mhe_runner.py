"""Moving Horizon Estimator runner.

Two modes:
  1. CSV mode  (plant_block is None):   reads measurements from a DataBlock CSV.
  2. Plant mode (plant_block is set):   simulates the plant forward to generate
     measurements, then estimates states — standalone MHE without MPC.
"""
import asyncio
import csv
import io
import math
from copy import copy as _copy
from typing import Callable, Awaitable

import numpy as np
from hilo_mpc import MHE

from api.models.mhe import MheRequest
from core.model_builder import build_model
from core.simulation_runner import _extract_latest


# ── Shared helpers ────────────────────────────────────────────────────────────

def _build_mhe(model_cfg, mhe_cfg, state_names):
    """Build and set up an MHE object from config."""
    model = build_model(model_cfg)
    model.setup(dt=mhe_cfg.dt, integrator="rk4")

    user_meas_names = list(model_cfg.measurement_names)
    meas_names_internal = model._y._names  # type: ignore[attr-defined]
    n_meas = len(meas_names_internal)

    mhe = MHE(model)
    mhe.horizon = mhe_cfg.horizon

    meas_weights = [
        mhe_cfg.measurement_noise.get(
            user_meas_names[i] if i < len(user_meas_names) else meas_names_internal[i],
            1.0,
        )
        for i in range(n_meas)
    ]
    mhe.quad_stage_cost.add_measurements(names=meas_names_internal, weights=meas_weights)

    proc_weights = [mhe_cfg.process_noise.get(n, 0.1) for n in state_names]
    mhe.quad_stage_cost.add_state_noise(weights=proc_weights)

    arrival_weights = [mhe_cfg.arrival_cost.get(n, 1.0) for n in state_names]
    initial_guess = [mhe_cfg.initial_guess.get(n, 0.0) for n in state_names]
    mhe.quad_arrival_cost.add_states(weights=arrival_weights, guess=initial_guess)

    mhe.setup()
    return mhe, meas_names_internal


def _build_measurement_fn(plant_cfg, state_names):
    """Return callable (x_vals) -> y_vals.  Identity when no expressions set."""
    if not plant_cfg.measurement_expressions:
        return lambda x_vals: list(x_vals)

    _math_ns = {
        "sin": math.sin, "cos": math.cos, "tan": math.tan,
        "exp": math.exp, "log": math.log, "sqrt": math.sqrt,
        "abs": abs, "pi": math.pi, "e": math.e,
        "__builtins__": {},
    }
    exprs = plant_cfg.measurement_expressions

    def _evaluate(x_vals):
        ns = dict(zip(state_names, x_vals))
        ns.update(_math_ns)
        return [float(eval(expr, {"__builtins__": {}}, ns)) for expr in exprs]

    return _evaluate


# ── Mode 1: CSV data ──────────────────────────────────────────────────────────

async def _run_mhe_from_data(
    req: MheRequest,
    send_frame: Callable[[dict], Awaitable[None]],
) -> None:
    model_cfg = req.model_block
    mhe_cfg = req.mhe_block
    state_names = [s.name for s in model_cfg.states]
    input_names = [i.name for i in model_cfg.inputs]

    mhe, _ = _build_mhe(model_cfg, mhe_cfg, state_names)

    reader = csv.DictReader(io.StringIO(req.data_block.csv_content))
    rows = list(reader)
    if not rows:
        raise ValueError("Data block CSV is empty.")

    t = 0.0
    for row in rows:
        y_meas = [float(row[c]) for c in req.data_block.output_cols]
        u_meas = (
            [float(row[c]) for c in req.data_block.input_cols]
            if req.data_block.input_cols
            else None
        )

        kwargs: dict = {"y_meas": y_meas}
        if u_meas is not None and input_names:
            kwargs["u_meas"] = u_meas

        mhe.add_measurements(**kwargs)
        x_est, _ = mhe.estimate()

        if x_est is not None:
            values = dict(zip(state_names, np.array(x_est).flatten().tolist()))
            await send_frame({"type": "step", "t": t, "values": values})

        t += mhe_cfg.dt
        await asyncio.sleep(0)


# ── Mode 2: Standalone plant simulation ──────────────────────────────────────

async def _run_mhe_with_plant(
    req: MheRequest,
    send_frame: Callable[[dict], Awaitable[None]],
) -> None:
    model_cfg = req.model_block
    plant_cfg = req.plant_block
    mhe_cfg = req.mhe_block

    est_state_names = [s.name for s in model_cfg.states]
    plant_state_names = [s.name for s in plant_cfg.states]
    plant_input_names = [i.name for i in plant_cfg.inputs]
    n_inputs = len(plant_input_names)

    # ── Build estimation model + MHE ─────────────────────────────────────────
    mhe, _ = _build_mhe(model_cfg, mhe_cfg, est_state_names)

    # ── Build plant model (strip measurement_expressions — we handle them) ──
    plant_cfg_no_meas = _copy(plant_cfg)
    plant_cfg_no_meas.measurement_expressions = []
    plant_model = build_model(plant_cfg_no_meas)
    plant_model.setup(dt=mhe_cfg.dt, integrator="rk4")

    # Plant initial conditions from MHE initial_guess (or zero)
    x0_plant = [mhe_cfg.initial_guess.get(s, 0.0) for s in plant_state_names]
    plant_model.set_initial_conditions(x0=x0_plant)

    param_values = [p.value for p in plant_cfg.parameters if p.name.strip()]
    measure = _build_measurement_fn(plant_cfg, plant_state_names)
    u_zero = [0.0] * n_inputs

    # ── Simulation loop ───────────────────────────────────────────────────────
    n_steps = max(1, int(round(mhe_cfg.t_end / mhe_cfg.dt)))
    x_plant_vals = list(x0_plant)

    for k in range(n_steps):
        # 1. Compute plant measurements at current state
        y_meas = measure(x_plant_vals)

        # 2. Feed to MHE
        kwargs: dict = {"y_meas": y_meas}
        if n_inputs > 0:
            kwargs["u_meas"] = u_zero
        mhe.add_measurements(**kwargs)
        x_est, _ = mhe.estimate()

        # 3. Simulate plant one step (zero input)
        if n_inputs > 0 and param_values:
            plant_model.simulate(u=u_zero, p=param_values)
        elif n_inputs > 0:
            plant_model.simulate(u=u_zero)
        elif param_values:
            plant_model.simulate(p=param_values)
        else:
            plant_model.simulate()

        x_plant_vals = list(_extract_latest(plant_model, plant_state_names).values())

        # 4. Stream: true plant states (plant_<name>) + estimated states (<name>)
        t_result = round((k + 1) * mhe_cfg.dt, 10)
        values: dict[str, float] = {}
        for i, name in enumerate(plant_state_names):
            values[f"plant_{name}"] = x_plant_vals[i]
        if x_est is not None:
            for i, name in enumerate(est_state_names):
                values[name] = float(np.array(x_est).flatten()[i])

        await send_frame({"type": "step", "t": t_result, "values": values})
        await asyncio.sleep(0)


# ── Entry point ───────────────────────────────────────────────────────────────

async def run_mhe(
    req: MheRequest,
    send_frame: Callable[[dict], Awaitable[None]],
) -> None:
    if req.plant_block is not None:
        await _run_mhe_with_plant(req, send_frame)
    elif req.data_block is not None:
        await _run_mhe_from_data(req, send_frame)
    else:
        raise ValueError("MHE requires either a plant_block or a data_block.")
