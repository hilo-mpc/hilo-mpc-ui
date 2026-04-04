import csv
import io
import math

import numpy as np

from api.models.ml import PredictRequest, EvaluateRequest
from core.ann_trainer import MLP, _ACTIVATIONS


def run_prediction(req: PredictRequest) -> list[dict]:
    """Run ANN forward pass on input CSV and return series."""
    ms = req.model_state
    reader = csv.DictReader(io.StringIO(req.csv_content))
    rows = list(reader)
    if not rows:
        return []

    X_raw = np.array([[float(r[c]) for c in req.input_cols] for r in rows], dtype=float)

    # Rebuild layer_configs from model_state
    prev_dim = X_raw.shape[1]
    layer_configs = []
    for layer in ms.layers:
        layer_configs.append((prev_dim, int(layer["units"]), layer["activation"]))
        prev_dim = int(layer["units"])

    model = MLP(layer_configs)
    # Load weights
    for i in range(len(model.W)):
        model.W[i] = np.array(ms.weights[i])
        model.b[i] = np.array(ms.biases[i]).reshape(1, -1)

    # Normalize input
    x_mean = np.array(ms.x_mean)
    x_std = np.array(ms.x_std)
    X = (X_raw - x_mean) / x_std

    # Forward pass
    preds_norm = model.forward(X)

    # Denormalize output
    y_mean = np.array(ms.y_mean)
    y_std = np.array(ms.y_std)
    preds = preds_norm * y_std + y_mean

    series = []
    for t, row in enumerate(preds):
        values = {col: float(val) for col, val in zip(ms.output_cols, row)}
        series.append({"t": t, "values": values})
    return series


_MATH_NS = {
    "sin": math.sin, "cos": math.cos, "tan": math.tan,
    "asin": math.asin, "acos": math.acos, "atan": math.atan,
    "atan2": math.atan2, "sinh": math.sinh, "cosh": math.cosh,
    "tanh": math.tanh, "exp": math.exp, "log": math.log,
    "sqrt": math.sqrt, "abs": abs, "pi": math.pi, "e": math.e,
    "__builtins__": {},
}


def run_evaluation(req: EvaluateRequest) -> list[dict]:
    """Evaluate symbolic expressions row-by-row on input CSV."""
    reader = csv.DictReader(io.StringIO(req.csv_content))
    rows = list(reader)
    if not rows:
        return []

    series = []
    for t, row in enumerate(rows):
        ns = dict(_MATH_NS)
        for col in req.input_cols:
            ns[col] = float(row[col])
        values = {}
        for od in req.output_defs:
            try:
                values[od.name] = float(eval(od.expr, {"__builtins__": {}}, ns))  # noqa: S307
            except Exception:
                values[od.name] = float("nan")
        series.append({"t": t, "values": values})
    return series
