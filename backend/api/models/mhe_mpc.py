from pydantic import BaseModel

from api.models.block import ModelBlockConfig, PlantBlockConfig, MpcBlockConfig
from api.models.mhe import MheBlockConfig


class MheMpcRequest(BaseModel):
    diagram_id: str
    model_block: ModelBlockConfig   # prediction model for NMPC (also used for MHE estimator)
    plant_block: PlantBlockConfig   # real plant to simulate
    mhe_block: MheBlockConfig       # MHE config (horizon, noise, arrival cost)
    mpc_block: MpcBlockConfig       # MPC config (horizon, weights, constraints)


class MheMpcResult(BaseModel):
    run_id: str
    status: str = "running"
    elapsed_seconds: float | None = None
    error: str | None = None
