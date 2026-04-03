export type BlockType = 'model' | 'simulation' | 'mpc' | 'plot';

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

// ── MPC ───────────────────────────────────────────────────────────────────────

export interface MpcBlockData {
  blockType: 'mpc';
  label: string;
  horizon: number;
  dt: number;
  tEnd: number;
  initialConditions: Record<string, number>;
  stateWeights: Record<string, number>;    // diagonal Q
  inputWeights: Record<string, number>;    // diagonal R
  stateRef: Record<string, number>;        // state setpoint
  inputRef: Record<string, number>;        // input setpoint
  stateLb: Record<string, number | null>;
  stateUb: Record<string, number | null>;
  inputLb: Record<string, number | null>;
  inputUb: Record<string, number | null>;
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

export type BlockData = ModelBlockData | SimulationBlockData | MpcBlockData | PlotBlockData;

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

export function defaultMpcData(): MpcBlockData {
  return {
    blockType: 'mpc',
    label: 'MPC',
    horizon: 10,
    dt: 0.1,
    tEnd: 10,
    initialConditions: {},
    stateWeights: {},
    inputWeights: {},
    stateRef: {},
    inputRef: {},
    stateLb: {},
    stateUb: {},
    inputLb: {},
    inputUb: {},
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
