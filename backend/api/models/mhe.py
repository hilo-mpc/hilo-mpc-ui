from typing import Optional
from pydantic import BaseModel

from api.models.block import ModelBlockConfig, PlantBlockConfig
from api.models.train import DataBlockConfig


class MheBlockConfig(BaseModel):
    block_id: str
    horizon: int = 10
    dt: float = 0.1
    t_end: float = 10.0             # total simulation time (standalone plant mode)
    process_noise: dict[str, float] = {}     # state name → Q weight
    measurement_noise: dict[str, float] = {}  # user meas name → R weight
    arrival_cost: dict[str, float] = {}       # state name → P0 weight
    initial_guess: dict[str, float] = {}      # state name → initial value


class MheRequest(BaseModel):
    diagram_id: str
    model_block: ModelBlockConfig            # must have measurement_expressions set
    data_block: Optional[DataBlockConfig] = None  # output_cols = measurements y; input_cols = inputs u
    plant_block: Optional[PlantBlockConfig] = None  # standalone mode: simulate plant to generate data
    mhe_block: MheBlockConfig


class MheResult(BaseModel):
    run_id: str
    status: str = "running"
    error: str | None = None
    elapsed_seconds: float | None = None
