from pydantic import BaseModel
from typing import Literal

from api.models.block import ModelBlockConfig, SimulationBlockConfig, PlotBlockConfig


class SimulationRequest(BaseModel):
    diagram_id: str
    model_block: ModelBlockConfig
    simulation_block: SimulationBlockConfig
    plot_blocks: list[PlotBlockConfig] = []


class TimeSeriesPoint(BaseModel):
    t: float
    values: dict[str, float]


class SimulationResult(BaseModel):
    run_id: str
    status: Literal["running", "completed", "failed"]
    series: list[TimeSeriesPoint] = []
    error: str | None = None
    elapsed_seconds: float | None = None
