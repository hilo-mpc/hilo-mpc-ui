"""Async simulation loop that streams WebSocket frames step by step."""
import asyncio
from typing import Callable, Awaitable
import numpy as np

from api.models.simulation import SimulationRequest
from api.models.block import InputScheduleEntry
from core.model_builder import build_model


def _get_input_at(
    t: float,
    schedule: list[InputScheduleEntry],
    n_inputs: int,
) -> list[float]:
    """Return the input vector for time t from the open-loop schedule."""
    for entry in sorted(schedule, key=lambda e: e.t_start, reverse=True):
        if entry.t_start <= t < entry.t_end:
            return [entry.values.get(k, 0.0) for k in sorted(entry.values)]
    return [0.0] * n_inputs


def _extract_latest(model, state_names: list[str]) -> dict[str, float]:
    """Pull the most recent value of each state from model.solution."""
    values: dict[str, float] = {}
    sol = model.solution
    for name in state_names:
        try:
            arr = sol.get_by_id(name)
            if arr is None:
                values[name] = 0.0
                continue
            # CasADi DM or numpy array
            if hasattr(arr, "full"):
                flat = np.array(arr.full()).flatten()
            else:
                flat = np.array(arr).flatten()
            values[name] = float(flat[-1])
        except Exception:
            values[name] = 0.0
    return values


async def run_simulation(
    req: SimulationRequest,
    send_frame: Callable[[dict], Awaitable[None]],
) -> None:
    model_cfg = req.model_block
    sim_cfg = req.simulation_block

    model = build_model(model_cfg)
    model.setup(dt=sim_cfg.dt, integrator=sim_cfg.solver)

    state_names = [s.name for s in model_cfg.states]
    n_inputs = len(model_cfg.inputs)

    x0 = [sim_cfg.initial_conditions.get(s, 0.0) for s in state_names]
    model.set_initial_conditions(x0=x0)

    n_steps = max(1, int(round(sim_cfg.t_end / sim_cfg.dt)))

    for k in range(n_steps):
        t_now = k * sim_cfg.dt
        u = _get_input_at(t_now, sim_cfg.input_schedule, n_inputs)

        if n_inputs > 0:
            model.simulate(u=u)
        else:
            model.simulate()

        t_result = round((k + 1) * sim_cfg.dt, 10)
        values = _extract_latest(model, state_names)

        await send_frame({"type": "step", "t": t_result, "values": values})
        await asyncio.sleep(0)  # yield to event loop so WS frames flush
