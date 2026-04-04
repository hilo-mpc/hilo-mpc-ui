"""Moving Horizon Estimator runner.

Loads measurement data from a DataBlock CSV, sets up the hilo-mpc MHE,
and streams estimated state frames back via send_frame.
"""
import asyncio
import csv
import io
from typing import Callable, Awaitable

import numpy as np
from hilo_mpc import MHE

from api.models.mhe import MheRequest
from core.model_builder import build_model


async def run_mhe(
    req: MheRequest,
    send_frame: Callable[[dict], Awaitable[None]],
) -> None:
    model_cfg = req.model_block
    mhe_cfg = req.mhe_block

    # ── 1. Build model with measurement equations ─────────────────────────────
    model = build_model(model_cfg)
    model.setup(dt=mhe_cfg.dt, integrator="rk4")

    state_names = [s.name for s in model_cfg.states]
    input_names = [i.name for i in model_cfg.inputs]
    user_meas_names = list(model_cfg.measurement_names)  # user-defined names for y_i

    # hilo-mpc auto-generates internal measurement names ('y' or 'y_1', 'y_2', …)
    meas_names_internal = model._y._names  # type: ignore[attr-defined]
    n_meas = len(meas_names_internal)

    # ── 2. Configure MHE ─────────────────────────────────────────────────────
    mhe = MHE(model)
    mhe.horizon = mhe_cfg.horizon

    # Measurement noise R (per measurement)
    meas_weights = [
        mhe_cfg.measurement_noise.get(
            user_meas_names[i] if i < len(user_meas_names) else meas_names_internal[i],
            1.0,
        )
        for i in range(n_meas)
    ]
    mhe.quad_stage_cost.add_measurements(names=meas_names_internal, weights=meas_weights)

    # Process noise Q (per state)
    proc_weights = [mhe_cfg.process_noise.get(n, 0.1) for n in state_names]
    mhe.quad_stage_cost.add_state_noise(weights=proc_weights)

    # Arrival cost P0 + initial guess
    arrival_weights = [mhe_cfg.arrival_cost.get(n, 1.0) for n in state_names]
    initial_guess = [mhe_cfg.initial_guess.get(n, 0.0) for n in state_names]
    mhe.quad_arrival_cost.add_states(weights=arrival_weights, guess=initial_guess)

    mhe.setup()

    # ── 3. Load measurement data ──────────────────────────────────────────────
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
