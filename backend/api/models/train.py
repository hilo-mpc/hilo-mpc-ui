from pydantic import BaseModel


class AnnLayerConfig(BaseModel):
    units: int
    activation: str = 'relu'  # relu | tanh | sigmoid | linear


class DataBlockConfig(BaseModel):
    block_id: str
    csv_content: str        # raw CSV text (with header row)
    input_cols: list[str]
    output_cols: list[str]


class AnnBlockConfig(BaseModel):
    block_id: str
    layers: list[AnnLayerConfig]
    epochs: int = 100
    batch_size: int = 32
    learning_rate: float = 0.001
    train_split: float = 0.8


class TrainRequest(BaseModel):
    diagram_id: str
    data_block: DataBlockConfig
    ann_block: AnnBlockConfig


class TrainResult(BaseModel):
    run_id: str
    status: str = 'running'
    error: str | None = None
    elapsed_seconds: float | None = None
