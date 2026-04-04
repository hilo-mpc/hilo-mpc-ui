from pydantic import BaseModel

from api.models.block import ModelBlockConfig, PlantBlockConfig, MpcBlockConfig


class MpcRequest(BaseModel):
    diagram_id: str
    model_block: ModelBlockConfig    # prediction model for NMPC optimisation
    plant_block: PlantBlockConfig    # real plant to simulate in closed loop
    mpc_block: MpcBlockConfig


class MpcResult(BaseModel):
    run_id: str
    status: str = "running"
    error: str | None = None
    elapsed_seconds: float | None = None
