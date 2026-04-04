export type BlockType = 'model' | 'simulation' | 'mpc' | 'plant' | 'plot' | 'data' | 'ann';

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
  flipped?: boolean;
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
  flipped?: boolean;
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
  flipped?: boolean;
}

// ── Plant ─────────────────────────────────────────────────────────────────────

export interface PlantBlockData {
  blockType: 'plant';
  label: string;
  states: Variable[];
  inputs: Variable[];
  parameters: Parameter[];
  odeExpressions: string[];
  /** h(x) expressions — one per measurement output; empty means y = x (full state) */
  measurementExpressions: string[];
  measurementNames: Variable[];   // names for each y_i
  configured: boolean;
  flipped?: boolean;
}

// ── Data ──────────────────────────────────────────────────────────────────────

export interface DataBlockData {
  blockType: 'data';
  label: string;
  fileName: string;
  columns: string[];
  rowCount: number;
  csvContent: string;
  inputCols: string[];
  outputCols: string[];
  configured: boolean;
  flipped?: boolean;
}

// ── ANN ───────────────────────────────────────────────────────────────────────

export interface AnnLayer {
  units: number;
  activation: 'relu' | 'tanh' | 'sigmoid' | 'linear';
}

export interface AnnBlockData {
  blockType: 'ann';
  label: string;
  layers: AnnLayer[];
  epochs: number;
  batchSize: number;
  learningRate: number;
  trainSplit: number;
  configured: boolean;
  flipped?: boolean;
}

// ── Plot ──────────────────────────────────────────────────────────────────────

export interface PlotBlockData {
  blockType: 'plot';
  label: string;
  xAxis: string;
  yAxes: string[];
  title: string;
  configured: boolean;
  flipped?: boolean;
}

// ── Union ─────────────────────────────────────────────────────────────────────

export type BlockData = ModelBlockData | SimulationBlockData | MpcBlockData | PlantBlockData | PlotBlockData | DataBlockData | AnnBlockData;

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

export function defaultPlantData(): PlantBlockData {
  return {
    blockType: 'plant',
    label: 'Plant',
    states: [],
    inputs: [],
    parameters: [],
    odeExpressions: [],
    measurementExpressions: [],
    measurementNames: [],
    configured: false,
  };
}

export function defaultDataData(): DataBlockData {
  return {
    blockType: 'data',
    label: 'Data',
    fileName: '',
    columns: [],
    rowCount: 0,
    csvContent: '',
    inputCols: [],
    outputCols: [],
    configured: false,
  };
}

export function defaultAnnData(): AnnBlockData {
  return {
    blockType: 'ann',
    label: 'ANN',
    layers: [
      { units: 64, activation: 'relu' },
      { units: 32, activation: 'relu' },
      { units: 1,  activation: 'linear' },
    ],
    epochs: 100,
    batchSize: 32,
    learningRate: 0.001,
    trainSplit: 0.8,
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
