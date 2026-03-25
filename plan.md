# hilo-mpc-ui: Drag-and-Drop UI Plan

## Context

hilo-mpc is a Python toolbox for Model Predictive Control (MPC) and optimal control. It exposes modular Python objects — `Model`, `NMPC`, `LinearMPC`, `EKF`, `UKF`, `MHE`, `SimpleControlLoop` — that control engineers compose in code to set up and run simulations. The goal of this UI is to give those engineers a visual, Simulink-style drag-and-drop canvas where they assemble these blocks graphically and run simulations without writing Python boilerplate.

The plan is staged: Stage 1 (MVP) covers simulation only. Later stages add control, estimation, ML, and web deployment.

---

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React 18 + TypeScript | Runs in both Electron and browser; strong ecosystem |
| Canvas | React Flow v12 | Purpose-built for node-based editors; handles wiring, viewport, minimap |
| Desktop shell | Electron 29 | Spawns Python sidecar; React code is Electron-agnostic |
| Backend | Python FastAPI | Thin async HTTP/WebSocket layer over hilo-mpc |
| IPC | REST + WebSockets | REST for CRUD; WebSocket for live simulation streaming |
| Styling | Tailwind CSS 3 | Utility-first, consistent engineering-tool aesthetic |
| State | Zustand | Minimal boilerplate; pairs well with React Flow |
| Charts | Recharts | Declarative React charts, no extra WebGL dep for Stage 1 |
| Build | Vite 5 (frontend) + electron-builder (packager) | Fast HMR, clean production bundling |

---

## Repository Structure

```
hilo-mpc-ui/
├── package.json                    # npm workspaces root
├── tsconfig.base.json
├── plan.md
│
├── electron/
│   └── src/
│       ├── main.ts                 # BrowserWindow, app lifecycle
│       ├── preload.ts              # contextBridge IPC
│       ├── pythonSidecar.ts        # spawn/kill uvicorn, health-check
│       └── ipc/handlers.ts         # open/save file dialogs
│
├── frontend/
│   └── src/
│       ├── App.tsx                 # root layout: sidebar + canvas + panel
│       ├── store/
│       │   ├── diagramStore.ts     # nodes, edges, diagram metadata
│       │   ├── simulationStore.ts  # run status, result time-series
│       │   └── uiStore.ts          # selected node, panel open/closed
│       ├── types/
│       │   ├── blocks.ts           # BlockType enum, block data interfaces
│       │   ├── diagram.ts          # DiagramSchema (save/load format)
│       │   └── simulation.ts       # SimulationResult, TimeSeriesPoint
│       ├── nodes/                  # React Flow custom nodes
│       │   ├── ModelNode.tsx
│       │   ├── SimulationNode.tsx
│       │   └── PlotNode.tsx
│       ├── panels/                 # Right-side config panels
│       │   ├── ModelPanel.tsx
│       │   ├── SimulationPanel.tsx
│       │   └── PlotPanel.tsx
│       ├── components/
│       │   ├── Canvas.tsx          # <ReactFlow> wrapper, connection validation
│       │   ├── Sidebar.tsx         # draggable block palette
│       │   ├── Toolbar.tsx         # Run, Stop, Save, Load
│       │   └── charts/TimeSeriesChart.tsx
│       ├── hooks/
│       │   ├── useSimulation.ts    # orchestrates POST /simulate + WS streaming
│       │   ├── useDiagramPersist.ts
│       │   └── useBackendHealth.ts
│       └── api/
│           ├── client.ts           # axios instance
│           ├── simulation.ts       # typed API wrappers
│           └── websocket.ts        # SimulationWebSocket class
│
└── backend/
    ├── main.py                     # FastAPI app entry
    ├── requirements.txt
    ├── api/
    │   ├── routes/
    │   │   ├── health.py
    │   │   ├── simulate.py         # POST /simulate, WS /ws/simulate/{run_id}
    │   │   └── validate.py         # POST /validate/equations
    │   └── models/
    │       ├── block.py            # Pydantic block configs
    │       └── simulation.py       # SimulationRequest, SimulationResult
    └── core/
        ├── model_builder.py        # ModelBlockConfig → hilo_mpc.Model
        └── simulation_runner.py    # async simulation loop, streams WS frames
```

---

## Block & Diagram Schema

### Block types (Stage 1)

```typescript
type BlockType = 'model' | 'simulation' | 'plot'
// Stage 2+: 'nmpc' | 'lmpc' | 'ekf' | 'ukf' | 'mhe' | 'ann' | 'gp'

interface ModelBlockData {
  blockType: 'model';
  states: Variable[];        // e.g. [{name:"theta"}, {name:"omega"}]
  inputs: Variable[];
  parameters: Variable[];
  equations: string;         // verbatim string → model.set_equations()
  configured: boolean;       // green dot on node when all required fields set
}

interface SimulationBlockData {
  blockType: 'simulation';
  dt: number;
  tEnd: number;
  initialConditions: Record<string, number>;
  inputSchedule: InputScheduleEntry[];   // open-loop u(t) segments
  solver: 'rk4' | 'cvodes' | 'idas';
  configured: boolean;
}

interface PlotBlockData {
  blockType: 'plot';
  xAxis: string;    // default "t"
  yAxes: string[];  // variable names to plot
  configured: boolean;
}
```

### Handle convention (connection ports)

```
ModelNode      out:  "model-out"
SimNode        in:   "sim-model-in"       out: "sim-results-out"
PlotNode       in:   "plot-data-in"
```

Connection rules (enforced in `isValidConnection`):
- Each input handle accepts at most one edge
- `sim-model-in` only accepts `model-out`
- `plot-data-in` only accepts `sim-results-out`
- A SimNode without a controller block runs open-loop (valid for Stage 1)

### Diagram save format (`.hilo` JSON)

```typescript
interface DiagramSchema {
  version: '1.0';
  id: string;
  name: string;
  createdAt: string;   // ISO 8601
  updatedAt: string;
  nodes: NodeSchema[];   // React Flow node + block data
  edges: EdgeSchema[];   // source/target handle IDs
  viewport?: { x: number; y: number; zoom: number };
}
```

---

## Backend API

```
GET  /health
     → { status, hilo_mpc_version, python_version }

POST /simulate
     body: SimulationRequest { model_block, simulation_block, plot_blocks }
     → { run_id: UUID }

WS   /ws/simulate/{run_id}
     streams:  { type: "step",     t, values: {...} }   (one frame per timestep)
               { type: "complete", elapsed_seconds }
               { type: "error",    message }

DELETE /simulate/{run_id}           → 204 (cancel in-progress run)

POST /validate/equations
     body: { equations, states, inputs }
     → { valid, error, parsed_states, parsed_inputs }
```

### Python core translation

```python
# model_builder.py
def build_model(cfg: ModelBlockConfig) -> Model:
    model = Model()
    model.set_equations(cfg.equations)   # verbatim string from the UI textarea
    return model

# simulation_runner.py
async def run_simulation(cfg, send_frame):
    model = build_model(cfg.model_block)
    sim = cfg.simulation_block
    model.setup(dt=sim.dt, integrator=sim.solver)
    model.set_initial_conditions(x0=list(sim.initial_conditions.values()))
    n_steps = int(sim.t_end / sim.dt)
    for k in range(n_steps):
        u = get_input_at(k * sim.dt, sim.input_schedule)
        model.simulate(u=u)
        values = extract_latest(model.solution)
        await send_frame({"type": "step", "t": (k + 1) * sim.dt, "values": values})
        await asyncio.sleep(0)   # yield to event loop
    await send_frame({"type": "complete"})
```

---

## Staged Roadmap

### Stage 1 — MVP: Simulation

Goal: a working Electron app where an engineer can drag a Model block, a Simulation block, and a Plot block onto a canvas, configure them, click Run, and watch a live chart.

**Sprint 1 — Skeleton & Plumbing** (Days 1–3)
1. Root `package.json` with npm workspaces (`frontend/`, `electron/`)
2. Vite + React + TypeScript + Tailwind scaffold in `frontend/`
3. Minimal Electron `main.ts` loading Vite dev server in dev mode, built file in production
4. `pythonSidecar.ts`: spawn `uvicorn backend.main:app --port 8765`, kill on quit, health-check on startup
5. FastAPI app with only `GET /health`
6. `useBackendHealth` hook + status indicator in the UI

*Verification:* `npm run dev` opens Electron. Status bar shows "Backend: OK". `curl localhost:8765/health` returns `{"status":"ok"}`.

**Sprint 2 — Canvas Foundation** (Days 4–6)
7. Install `reactflow`, `zustand`, `recharts`
8. `diagramStore.ts` with `nodes`, `edges`, React Flow change callbacks
9. `Canvas.tsx` wrapping `<ReactFlow>` with `<Background>`, `<Controls>`, `<MiniMap>`
10. `Sidebar.tsx`: palette with three draggable items; HTML5 drag + `screenToFlowPosition` on drop
11. Stub node components with correct handles and colored headers

*Verification:* Drag all three blocks, connect Model → Simulation → Plot with wires. Nodes move, delete, reconnect correctly.

**Sprint 3 — Config Panels** (Days 7–10)
12. `uiStore` tracks `selectedNodeId`; clicking a node opens the right panel
13. `ModelPanel`: variable table (add/remove) + equation `<textarea>`
14. `SimulationPanel`: `dt`/`tEnd` inputs + initial condition table auto-populated from connected Model's states + input schedule table
15. `PlotPanel`: multi-select for Y-axes; X defaults to `t`
16. `configured` derived state: green dot on node header when required fields are filled

*Verification:* Configure a full pendulum diagram. All three node headers show green dots.

**Sprint 4 — Equation Validation** (Days 11–12)
17. `POST /validate/equations`: try `model.set_equations()`, catch exception, return result
18. `ModelPanel` debounces textarea → calls endpoint → red/green border + error message

*Verification:* Malformed equation → red error within 500 ms. Fixed equation → green, parsed variable list shown.

**Sprint 5 — Simulation Execution** (Days 13–17)
19. `POST /simulate` + async background task + WebSocket `/ws/simulate/{run_id}`
20. `model_builder.py` + `simulation_runner.py` with per-step streaming
21. `useSimulation` hook: POST → `run_id` → open WebSocket → append frames to `simulationStore`
22. `Toolbar.tsx` Run button with spinner while running; Stop button sends DELETE
23. `PlotNode` renders `TimeSeriesChart` live as frames arrive

*Verification:* Pendulum (`x0=[2.5, 0, 1.5, 0]`, `dt=0.1`, `tEnd=10`) completes and renders animated chart.

**Sprint 6 — Save/Load** (Days 18–19)
24. `useDiagramPersist`: serialize `diagramStore` → `DiagramSchema` JSON
25. Electron `ipcMain` handlers for native open/save file dialogs (`.hilo` files)
26. Save/Load buttons in toolbar

*Verification:* Save → restart → load → all block configs restored exactly.

**Sprint 7 — Packaging** (Days 20–21)
27. `electron-builder` config; bundle Vite output + Python venv (or install-on-first-run)
28. Test on Linux and macOS

*Verification:* Packaged installer runs on a fresh machine with no prior setup.

---

### Stage 2 — MPC / Closed-Loop Control

- Add `NMPCNode`, `LMPCNode` with handles `nmpc-model-in` / `nmpc-out`
- `NMPCPanel`: horizon slider, cost weight matrix editor, constraint bounds table
- Add `ReferenceNode` for step/ramp/sinusoidal reference signals
- Backend: `NMPCBlockConfig` Pydantic model; `simulation_runner` uses `SimpleControlLoop(model, nmpc).run(n_steps)` when a controller block is wired to SimNode
- Extended connection rules: ModelNode output can fan out to both SimNode and NMPCNode

*Verification:* NMPC pendulum from hilo-mpc examples reproduced via UI. Plot block shows state trajectory + control input `F(t)` simultaneously.

---

### Stage 3 — State Estimation

- Add `EKFNode`, `UKFNode`, `MHENode` with handle `estimator-model-in` / `estimator-out`
- `EKFPanel`/`UKFPanel`: covariance matrix editors (`R`, `Q`, `P0`)
- Backend: instantiate `EKF(model)` / `UKF(model, α, β, κ)`; each step frame carries both `true` and `estimated` values
- `PlotPanel`: overlay true vs. estimated with solid/dashed line styling

*Verification:* EKF CSTR example reproduced; Plot block overlays true vs. estimated state.

---

### Stage 4 — ML Integration

- Add `ANNNode` (neural network) and `GPNode` (Gaussian process)
- Configure architecture (layer sizes, activations) or GP kernel in side panel
- Train on generated data; inject learned model into NMPC prediction model or estimator
- Backend: leverage hilo-mpc's TensorFlow/PyTorch integration

---

### Stage 5 — Web Deployment & Polish

- `VITE_MODE=web` env var: replace Electron IPC calls with HTTP API calls for save/load
- FastAPI + React SPA deployable via Docker — same React code, no Electron required
- Diagram import/export via browser file download/upload APIs
- Block library browser: searchable palette grouped by category (Simulation / Control / Estimation / ML), each block described by a `BlockDefinition` registry
- Diagram version history; shareable diagram links (diagram stored server-side by ID)

*Verification:* `http://localhost:5173` in a plain browser runs a full Stage 1 simulation. Diagram saved in desktop app opens in web version.

---

## Critical Files

| File | Why critical |
|---|---|
| `backend/core/model_builder.py` | Translates block JSON → live `hilo_mpc.Model`; all simulations flow through here |
| `backend/core/simulation_runner.py` | Async loop that calls `model.simulate()` and streams WebSocket frames |
| `frontend/src/store/diagramStore.ts` | Single source of truth for all canvas state |
| `frontend/src/types/blocks.ts` | Contract between frontend rendering, panel editors, and backend payloads |
| `electron/src/pythonSidecar.ts` | Python process lifecycle; must handle startup health-check and clean shutdown |

---

## Key Design Decisions

**Equation string as primary Model input (Stage 1)**
hilo-mpc's `model.set_equations(str)` accepts a rich multi-line string handling ODEs, DAEs, and constants — exactly as control engineers already write. A visual equation editor would be a large investment for little gain in Stage 1. The textarea is the simplest bridge between what engineers write and what the API accepts. A structured variable+expression table can be added later as an optional `dynamicsMode` toggle.

**WebSockets for simulation output, not polling**
Simulations can run for hundreds of steps and the key UX value is a live-updating chart. WebSocket streaming eliminates batching latency and avoids the complexity of polling intervals. The connection lifecycle (open after POST, close on `complete`) keeps the REST API stateless.

**Electron-first, not web-first**
hilo-mpc depends on CasADi compiled C++ solvers — not available as WASM. A Python backend must run locally. Electron's `child_process` manages that cleanly. All Electron-specific code is isolated in `pythonSidecar.ts` and the `preload.ts` contextBridge; the React renderer has zero Electron imports and works unchanged in a browser.

**`.hilo` JSON file as the primary artifact**
Analogous to a Simulink `.slx` file. Storing state as a diff-able JSON file on disk works fully offline, requires no database, and fits naturally into version control workflows. Multi-user server-side persistence is a Stage 5 concern.
