export type BlockType = 'model' | 'simulation' | 'plot';

export interface Variable {
  name: string;
  description?: string;
  unit?: string;
}

export interface Parameter {
  name: string;
  value: number;
  description?: string;
}

export interface InputScheduleEntry {
  id: string;
  tStart: number;
  tEnd: number;
  values: Record<string, number>;
}

// ── Model ─────────────────────────────────────────────────────────────────────

export interface ModelBlockData {
  blockType: 'model';
  label: string;
  states: Variable[];
  inputs: Variable[];
  parameters: Parameter[];
  /** One CasADi expression per state — maps directly to hilo-mpc set_dynamical_equations() */
  odeExpressions: string[];
  configured: boolean;
}

// ── Simulation ────────────────────────────────────────────────────────────────

export type Solver = 'cvodes' | 'rk4' | 'idas';

export interface SimulationBlockData {
  blockType: 'simulation';
  label: string;
  dt: number;
  tEnd: number;
  initialConditions: Record<string, number>;
  inputSchedule: InputScheduleEntry[];
  solver: Solver;
  configured: boolean;
}

// ── Plot ──────────────────────────────────────────────────────────────────────

export interface PlotBlockData {
  blockType: 'plot';
  label: string;
  xAxis: string;
  yAxes: string[];
  title: string;
  configured: boolean;
}

// ── Union ─────────────────────────────────────────────────────────────────────

export type BlockData = ModelBlockData | SimulationBlockData | PlotBlockData;

// ── Default factories ─────────────────────────────────────────────────────────

export function defaultModelData(): ModelBlockData {
  return {
    blockType: 'model',
    label: 'Model',
    states: [],
    inputs: [],
    parameters: [],
    odeExpressions: [],
    configured: false,
  };
}

export function defaultSimulationData(): SimulationBlockData {
  return {
    blockType: 'simulation',
    label: 'Simulation',
    dt: 0.1,
    tEnd: 10,
    initialConditions: {},
    inputSchedule: [],
    solver: 'cvodes',
    configured: false,
  };
}

export function defaultPlotData(): PlotBlockData {
  return {
    blockType: 'plot',
    label: 'Plot',
    xAxis: 't',
    yAxes: [],
    title: '',
    configured: false,
  };
}
