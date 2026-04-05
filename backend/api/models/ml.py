from pydantic import BaseModel

class TrainedModelState(BaseModel):
    layers: list[dict]
    weights: list[list]   # list of 2D weight matrices (as nested lists)
    biases: list[list]    # list of 1D bias vectors (as lists)
    x_mean: list[float]
    x_std: list[float]
    y_mean: list[float]
    y_std: list[float]
    input_cols: list[str]
    output_cols: list[str]

class PredictRequest(BaseModel):
    csv_content: str
    input_cols: list[str]
    model_state: TrainedModelState

class OutputDef(BaseModel):
    name: str
    expr: str

class EvaluateRequest(BaseModel):
    csv_content: str
    input_cols: list[str]
    output_defs: list[OutputDef]
