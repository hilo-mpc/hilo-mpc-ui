export type BlockType = 'model' | 'simulation' | 'mpc' | 'plant' | 'plot' | 'data' | 'ann' | 'function' | 'mhe';

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
  /** h(x) measurement equations — used by MHE. Empty = full state observation. */
  measurementExpressions: string[];
  /** User-defined name for each measurement output y_i */
  measurementNames: Variable[];
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

export interface TrainedModelState {
  layers: { units: number; activation: string }[];
  weights: number[][][];
  biases: number[][];
  xMean: number[];
  xStd: number[];
  yMean: number[];
  yStd: number[];
  inputCols: string[];
  outputCols: string[];
}

export interface AnnBlockData {
  blockType: 'ann';
  label: string;
  layers: AnnLayer[];
  epochs: number;
  batchSize: number;
  learningRate: number;
  trainSplit: number;
  trainedModel: TrainedModelState | null;
  configured: boolean;
  flipped?: boolean;
}

// ── MHE ───────────────────────────────────────────────────────────────────────

export interface MheBlockData {
  blockType: 'mhe';
  label: string;
  horizon: number;
  dt: number;
  tEnd: number;                             // simulation duration (standalone plant mode)
  processNoise: Record<string, number>;     // state name → Q weight
  measurementNoise: Record<string, number>; // meas name → R weight
  arrivalCost: Record<string, number>;      // state name → P0 weight
  initialGuess: Record<string, number>;     // state name → initial value
  configured: boolean;
  flipped?: boolean;
}

// ── Function ──────────────────────────────────────────────────────────────────

export interface FunctionOutput {
  name: string;
  expr: string;
}

export interface FunctionBlockData {
  blockType: 'function';
  label: string;
  inputNames: string[];
  outputs: FunctionOutput[];
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

export type BlockData = ModelBlockData | SimulationBlockData | MpcBlockData | PlantBlockData | PlotBlockData | DataBlockData | AnnBlockData | FunctionBlockData | MheBlockData;

// ── Default factories ─────────────────────────────────────────────────────────

export function defaultModelData(): ModelBlockData {
  return {
    blockType: 'model',
    label: 'Model',
    states: [{ name: 'x' }],
    inputs: [{ name: 'u' }],
    parameters: [{ name: 'p', value: 1.0 }],
    odeExpressions: ['p * u'],
    measurementExpressions: ['x'],
    measurementNames: [{ name: 'y' }],
    configured: true,
  };
}

export function defaultMheData(): MheBlockData {
  return {
    blockType: 'mhe',
    label: 'MHE',
    horizon: 10,
    dt: 0.1,
    tEnd: 10,
    processNoise: {},
    measurementNoise: {},
    arrivalCost: {},
    initialGuess: {},
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
    states: [{ name: 'x' }],
    inputs: [{ name: 'u' }],
    parameters: [{ name: 'p', value: 1.0 }],
    odeExpressions: ['p * u'],
    measurementExpressions: ['x'],
    measurementNames: [{ name: 'y' }],
    configured: true,
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
    trainedModel: null,
    configured: false,
  };
}

export function defaultFunctionData(): FunctionBlockData {
  return {
    blockType: 'function',
    label: 'f(x)',
    inputNames: ['x'],
    outputs: [{ name: 'y', expr: 'x' }],
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
