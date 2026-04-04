import asyncio
import csv
import io

import numpy as np

from api.models.train import TrainRequest


# ---------------------------------------------------------------------------
# Activation functions
# ---------------------------------------------------------------------------

def _relu(z):
    return np.maximum(0.0, z)


def _relu_grad(z):
    return (z > 0).astype(float)


def _tanh(z):
    return np.tanh(z)


def _tanh_grad(z):
    t = np.tanh(z)
    return 1.0 - t * t


def _sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.clip(z, -500, 500)))


def _sigmoid_grad(z):
    s = _sigmoid(z)
    return s * (1.0 - s)


def _linear(z):
    return z


def _linear_grad(z):
    return np.ones_like(z)


_ACTIVATIONS = {
    'relu':    (_relu,    _relu_grad),
    'tanh':    (_tanh,    _tanh_grad),
    'sigmoid': (_sigmoid, _sigmoid_grad),
    'linear':  (_linear,  _linear_grad),
}


# ---------------------------------------------------------------------------
# Weight initialisation
# ---------------------------------------------------------------------------

def _init_weights(fan_in: int, fan_out: int, activation: str) -> np.ndarray:
    """He init for relu, Xavier (Glorot) otherwise."""
    if activation == 'relu':
        std = np.sqrt(2.0 / fan_in)
    else:
        std = np.sqrt(2.0 / (fan_in + fan_out))
    return np.random.randn(fan_in, fan_out) * std


# ---------------------------------------------------------------------------
# Adam optimizer
# ---------------------------------------------------------------------------

class AdamOptimizer:
    def __init__(self, lr: float = 0.001, b1: float = 0.9, b2: float = 0.999, eps: float = 1e-8):
        self.lr = lr
        self.b1 = b1
        self.b2 = b2
        self.eps = eps
        self.t = 0
        self._m: list[np.ndarray] = []
        self._v: list[np.ndarray] = []

    def init(self, params: list[np.ndarray]):
        self._m = [np.zeros_like(p) for p in params]
        self._v = [np.zeros_like(p) for p in params]

    def step(self, params: list[np.ndarray], grads: list[np.ndarray]) -> list[np.ndarray]:
        self.t += 1
        updated = []
        for i, (p, g) in enumerate(zip(params, grads)):
            self._m[i] = self.b1 * self._m[i] + (1.0 - self.b1) * g
            self._v[i] = self.b2 * self._v[i] + (1.0 - self.b2) * (g * g)
            m_hat = self._m[i] / (1.0 - self.b1 ** self.t)
            v_hat = self._v[i] / (1.0 - self.b2 ** self.t)
            updated.append(p - self.lr * m_hat / (np.sqrt(v_hat) + self.eps))
        return updated


# ---------------------------------------------------------------------------
# MLP (pure numpy feedforward network)
# ---------------------------------------------------------------------------

class MLP:
    """Feedforward neural network with configurable layers and activations."""

    def __init__(self, layer_configs):
        """
        layer_configs: list of (in_dim, out_dim, activation_name)
        """
        self.activations = []
        self.W: list[np.ndarray] = []
        self.b: list[np.ndarray] = []

        for fan_in, fan_out, act_name in layer_configs:
            if act_name not in _ACTIVATIONS:
                raise ValueError(f"Unknown activation '{act_name}'. Choose from: {list(_ACTIVATIONS)}")
            self.W.append(_init_weights(fan_in, fan_out, act_name))
            self.b.append(np.zeros((1, fan_out)))
            self.activations.append(act_name)

        # pre-activations and post-activations saved during forward pass
        self._Z: list[np.ndarray] = []
        self._A: list[np.ndarray] = []

    def parameters(self) -> list[np.ndarray]:
        params = []
        for W, b in zip(self.W, self.b):
            params.append(W)
            params.append(b)
        return params

    def set_parameters(self, params: list[np.ndarray]):
        for i in range(len(self.W)):
            self.W[i] = params[2 * i]
            self.b[i] = params[2 * i + 1]

    def forward(self, X: np.ndarray) -> np.ndarray:
        self._Z = []
        self._A = []
        a = X
        for W, b, act_name in zip(self.W, self.b, self.activations):
            z = a @ W + b
            act_fn, _ = _ACTIVATIONS[act_name]
            a = act_fn(z)
            self._Z.append(z)
            self._A.append(a)
        return a

    def backward(self, X: np.ndarray, y: np.ndarray) -> list[np.ndarray]:
        """MSE loss backward pass. Returns gradients in same order as parameters()."""
        n = X.shape[0]
        # output layer delta (dL/dz for MSE + activation)
        pred = self._A[-1]
        dL_da = 2.0 * (pred - y) / n  # dMSE/d(output)

        grads = []
        da = dL_da
        for i in reversed(range(len(self.W))):
            _, act_grad = _ACTIVATIONS[self.activations[i]]
            dz = da * act_grad(self._Z[i])
            a_prev = self._A[i - 1] if i > 0 else X
            dW = a_prev.T @ dz
            db = dz.sum(axis=0, keepdims=True)
            da = dz @ self.W[i].T
            grads.insert(0, db)
            grads.insert(0, dW)
        return grads


# ---------------------------------------------------------------------------
# Main training coroutine
# ---------------------------------------------------------------------------

async def run_training(req: TrainRequest, send_frame) -> None:
    db = req.data_block
    ab = req.ann_block

    # --- Parse CSV ---
    reader = csv.DictReader(io.StringIO(db.csv_content))
    rows = list(reader)
    if not rows:
        raise ValueError("CSV is empty or has no data rows")

    X_raw = np.array([[float(r[c]) for c in db.input_cols] for r in rows], dtype=float)
    y_raw = np.array([[float(r[c]) for c in db.output_cols] for r in rows], dtype=float)

    n_samples = X_raw.shape[0]
    n_inputs = X_raw.shape[1]
    n_outputs = y_raw.shape[1]

    # --- Normalize ---
    X_mean = X_raw.mean(axis=0)
    X_std = X_raw.std(axis=0) + 1e-8
    y_mean = y_raw.mean(axis=0)
    y_std = y_raw.std(axis=0) + 1e-8

    X = (X_raw - X_mean) / X_std
    y = (y_raw - y_mean) / y_std

    # --- Shuffle and split ---
    perm = np.random.permutation(n_samples)
    X = X[perm]
    y = y[perm]

    n_train = int(n_samples * ab.train_split)
    X_train, y_train = X[:n_train], y[:n_train]
    X_val, y_val = X[n_train:], y[n_train:]
    has_val = len(X_val) > 0

    # --- Build layer config ---
    # Input dim -> first hidden, hidden -> hidden, last hidden -> output
    layer_configs = []
    prev_dim = n_inputs
    for layer in ab.layers:
        layer_configs.append((prev_dim, layer.units, layer.activation))
        prev_dim = layer.units
    # Final output layer (linear)
    layer_configs.append((prev_dim, n_outputs, 'linear'))

    # --- Build model and optimizer ---
    np.random.seed(0)
    model = MLP(layer_configs)
    optimizer = AdamOptimizer(lr=ab.learning_rate)
    optimizer.init(model.parameters())

    batch_size = ab.batch_size
    epochs = ab.epochs

    for epoch in range(1, epochs + 1):
        # --- Mini-batch SGD ---
        perm_e = np.random.permutation(n_train)
        X_shuf = X_train[perm_e]
        y_shuf = y_train[perm_e]

        for start in range(0, n_train, batch_size):
            Xb = X_shuf[start:start + batch_size]
            yb = y_shuf[start:start + batch_size]
            model.forward(Xb)
            grads = model.backward(Xb, yb)
            new_params = optimizer.step(model.parameters(), grads)
            model.set_parameters(new_params)

        # --- Compute losses ---
        pred_train = model.forward(X_train)
        train_loss = float(np.mean((pred_train - y_train) ** 2))

        frame: dict = {"type": "epoch", "epoch": epoch, "train_loss": train_loss}

        if has_val:
            pred_val = model.forward(X_val)
            val_loss = float(np.mean((pred_val - y_val) ** 2))
            frame["val_loss"] = val_loss

        await send_frame(frame)

        # Yield to event loop every 10 epochs
        if epoch % 10 == 0:
            await asyncio.sleep(0)
