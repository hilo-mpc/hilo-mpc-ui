# HILO-MPC UI

A drag-and-drop desktop interface for [hilo-mpc](https://github.com/hilo-mpc/hilo-mpc) — build and run simulations visually, like Simulink.

## Stage 1 — Simulation (current)

Drag a **Model** block, a **Simulation** block, and a **Plot** block onto the canvas. Wire them together, configure them in the right panel, then click **Run**.

---

## Quick Start

### 1. Python backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start the backend manually (dev mode):
uvicorn main:app --host 127.0.0.1 --port 8765 --reload
```

### 2. Frontend (browser dev mode)

```bash
npm install              # from repo root
npm run dev:frontend     # starts Vite at http://localhost:5173
```

Open `http://localhost:5173` in your browser.

### 3. Desktop app (Electron)

Make sure the Python backend is already running, then:

```bash
npm run dev              # starts both Vite and Electron
```

---

## Example: Inverted Pendulum

1. Drag a **Model** block onto the canvas.
2. In the config panel, add states: `theta`, `omega` and input: `F`.
3. Set ODE expressions:
   - `theta` → `omega`
   - `omega` → `F - 2*theta - 0.8*omega`
4. Drag a **Simulation** block and connect `model-out → sim-model-in`.
5. Set `dt = 0.1`, `T end = 10`, initial conditions `theta(0) = 1.5`, `omega(0) = 0`.
6. Drag a **Plot** block and connect `sim-results-out → plot-data-in`.
7. Select `theta` and `omega` in the plot panel.
8. Click **Run** and watch the live chart.

---

## Project Structure

```
hilo-mpc-ui/
├── backend/          Python FastAPI + hilo-mpc
├── electron/         Electron main process
├── frontend/         React + Vite + TypeScript
└── plan.md           Full staged roadmap
```

See [plan.md](./plan.md) for the full roadmap (Stages 1–5).
