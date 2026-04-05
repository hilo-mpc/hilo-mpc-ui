import { apiClient } from './client';
import type { ModelBlockData, SimulationBlockData, PlotBlockData, MpcBlockData, PlantBlockData, DataBlockData, AnnBlockData, MheBlockData, TrainedModelState, InputScheduleEntry } from '../types/blocks';

// ── Request shape matching the Python Pydantic models ─────────────────────────

interface BackendVariable {
  name: string;
  description?: string;
  unit?: string;
}

interface BackendParameter {
  name: string;
  value: number;
}

interface BackendInputEntry {
  t_start: number;
  t_end: number;
  values: Record<string, number>;
}

interface BackendModelBlock {
  block_id: string;
  states: BackendVariable[];
  inputs: BackendVariable[];
  parameters: BackendParameter[];
  ode_expressions: string[];
}

interface BackendSimBlock {
  block_id: string;
  dt: number;
  t_end: number;
  initial_conditions: Record<string, number>;
  input_schedule: BackendInputEntry[];
  solver: string;
  integrator_options: Record<string, unknown>;
}

interface BackendPlotBlock {
  block_id: string;
  x_axis: string;
  y_axes: string[];
}

interface SimulateRequest {
  diagram_id: string;
  model_block: BackendModelBlock;
  simulation_block: BackendSimBlock;
  plot_blocks: BackendPlotBlock[];
}

function serializeSchedule(entries: InputScheduleEntry[]): BackendInputEntry[] {
  return entries.map((e) => ({
    t_start: e.tStart,
    t_end: e.tEnd,
    values: e.values,
  }));
}

export function buildSimulateRequest(
  diagramId: string,
  model: ModelBlockData,
  sim: SimulationBlockData,
  plots: PlotBlockData[]
): SimulateRequest {
  return {
    diagram_id: diagramId,
    model_block: {
      block_id: 'model',
      states: model.states,
      inputs: model.inputs,
      parameters: model.parameters.map((p) => ({ name: p.name, value: p.value })),
      ode_expressions: model.odeExpressions,
    },
    simulation_block: {
      block_id: 'sim',
      dt: sim.dt,
      t_end: sim.tEnd,
      initial_conditions: sim.initialConditions,
      input_schedule: serializeSchedule(sim.inputSchedule),
      solver: sim.solver,
      integrator_options: {},
    },
    plot_blocks: plots.map((p) => ({
      block_id: p.label,
      x_axis: p.xAxis,
      y_axes: p.yAxes,
    })),
  };
}

export async function postSimulate(req: SimulateRequest): Promise<string> {
  const resp = await apiClient.post<{ run_id: string }>('/simulate', req);
  return resp.data.run_id;
}

export async function deleteSimulate(runId: string): Promise<void> {
  await apiClient.delete(`/simulate/${runId}`);
}

// ── MPC API ───────────────────────────────────────────────────────────────────

interface BackendMpcBlock {
  block_id: string;
  horizon: number;
  dt: number;
  t_end: number;
  initial_conditions: Record<string, number>;
  state_weights: Record<string, number>;
  input_weights: Record<string, number>;
  state_ref: Record<string, number>;
  input_ref: Record<string, number>;
  state_lb: Record<string, number | null>;
  state_ub: Record<string, number | null>;
  input_lb: Record<string, number | null>;
  input_ub: Record<string, number | null>;
}

interface BackendPlantBlock {
  block_id: string;
  states: BackendVariable[];
  inputs: BackendVariable[];
  parameters: BackendParameter[];
  ode_expressions: string[];
  measurement_expressions: string[];
  measurement_names: string[];
}

interface MpcRequest {
  diagram_id: string;
  model_block: BackendModelBlock;
  plant_block: BackendPlantBlock;
  mpc_block: BackendMpcBlock;
}

export function buildMpcRequest(
  diagramId: string,
  model: ModelBlockData,
  plant: PlantBlockData,
  mpc: MpcBlockData,
): MpcRequest {
  return {
    diagram_id: diagramId,
    model_block: {
      block_id: 'model',
      states: model.states,
      inputs: model.inputs,
      parameters: model.parameters.map((p) => ({ name: p.name, value: p.value })),
      ode_expressions: model.odeExpressions,
    },
    plant_block: {
      block_id: 'plant',
      states: plant.states,
      inputs: plant.inputs,
      parameters: plant.parameters.map((p) => ({ name: p.name, value: p.value })),
      ode_expressions: plant.odeExpressions,
      measurement_expressions: plant.measurementExpressions,
      measurement_names: plant.measurementNames.map((m) => m.name),
    },
    mpc_block: {
      block_id: mpc.label,
      horizon: mpc.horizon,
      dt: mpc.dt,
      t_end: mpc.tEnd,
      initial_conditions: mpc.initialConditions,
      state_weights: mpc.stateWeights,
      input_weights: mpc.inputWeights,
      state_ref: mpc.stateRef,
      input_ref: mpc.inputRef,
      state_lb: mpc.stateLb,
      state_ub: mpc.stateUb,
      input_lb: mpc.inputLb,
      input_ub: mpc.inputUb,
    },
  };
}

export async function postMpc(req: MpcRequest): Promise<string> {
  const resp = await apiClient.post<{ run_id: string }>('/mpc', req);
  return resp.data.run_id;
}

export async function deleteMpc(runId: string): Promise<void> {
  await apiClient.delete(`/mpc/${runId}`);
}

// ── Train API ─────────────────────────────────────────────────────────────────

interface BackendAnnLayer {
  units: number;
  activation: string;
}

interface TrainRequest {
  diagram_id: string;
  data_block: {
    block_id: string;
    csv_content: string;
    input_cols: string[];
    output_cols: string[];
  };
  ann_block: {
    block_id: string;
    layers: BackendAnnLayer[];
    epochs: number;
    batch_size: number;
    learning_rate: number;
    train_split: number;
  };
}

export function buildTrainRequest(
  diagramId: string,
  data: DataBlockData,
  ann: AnnBlockData,
): TrainRequest {
  return {
    diagram_id: diagramId,
    data_block: {
      block_id: data.label,
      csv_content: data.csvContent,
      input_cols: data.inputCols,
      output_cols: data.outputCols,
    },
    ann_block: {
      block_id: ann.label,
      layers: ann.layers.map((l) => ({ units: l.units, activation: l.activation })),
      epochs: ann.epochs,
      batch_size: ann.batchSize,
      learning_rate: ann.learningRate,
      train_split: ann.trainSplit,
    },
  };
}

export async function postTrain(req: TrainRequest): Promise<string> {
  const resp = await apiClient.post<{ run_id: string }>('/train', req);
  return resp.data.run_id;
}

export async function deleteTrain(runId: string): Promise<void> {
  await apiClient.delete(`/train/${runId}`);
}

// ── MHE API ───────────────────────────────────────────────────────────────────

interface BackendMheBlock {
  block_id: string;
  horizon: number;
  dt: number;
  process_noise: Record<string, number>;
  measurement_noise: Record<string, number>;
  arrival_cost: Record<string, number>;
  initial_guess: Record<string, number>;
}

interface MheRequest {
  diagram_id: string;
  model_block: BackendModelBlock & {
    measurement_expressions: string[];
    measurement_names: string[];
  };
  data_block: {
    block_id: string;
    csv_content: string;
    input_cols: string[];
    output_cols: string[];
  };
  mhe_block: BackendMheBlock;
}

export function buildMheRequest(
  diagramId: string,
  model: ModelBlockData,
  data: DataBlockData,
  mhe: MheBlockData,
): MheRequest {
  return {
    diagram_id: diagramId,
    model_block: {
      block_id: 'model',
      states: model.states,
      inputs: model.inputs,
      parameters: model.parameters.map((p) => ({ name: p.name, value: p.value })),
      ode_expressions: model.odeExpressions,
      measurement_expressions: model.measurementExpressions,
      measurement_names: model.measurementNames.map((m) => m.name),
    },
    data_block: {
      block_id: data.label,
      csv_content: data.csvContent,
      input_cols: data.inputCols,
      output_cols: data.outputCols,
    },
    mhe_block: {
      block_id: mhe.label,
      horizon: mhe.horizon,
      dt: mhe.dt,
      process_noise: mhe.processNoise,
      measurement_noise: mhe.measurementNoise,
      arrival_cost: mhe.arrivalCost,
      initial_guess: mhe.initialGuess,
    },
  };
}

export async function postMhe(req: MheRequest): Promise<string> {
  const resp = await apiClient.post<{ run_id: string }>('/mhe', req);
  return resp.data.run_id;
}

export async function deleteMhe(runId: string): Promise<void> {
  await apiClient.delete(`/mhe/${runId}`);
}

// ── MHE-MPC combined online API ───────────────────────────────────────────────

interface MheMpcRequest {
  diagram_id: string;
  model_block: BackendModelBlock & {
    measurement_expressions: string[];
    measurement_names: string[];
  };
  plant_block: BackendPlantBlock;
  mhe_block: BackendMheBlock;
  mpc_block: BackendMpcBlock;
}

export function buildMheMpcRequest(
  diagramId: string,
  model: ModelBlockData,
  plant: PlantBlockData,
  mhe: MheBlockData,
  mpc: MpcBlockData,
): MheMpcRequest {
  return {
    diagram_id: diagramId,
    model_block: {
      block_id: 'model',
      states: model.states,
      inputs: model.inputs,
      parameters: model.parameters.map((p) => ({ name: p.name, value: p.value })),
      ode_expressions: model.odeExpressions,
      measurement_expressions: model.measurementExpressions,
      measurement_names: model.measurementNames.map((m) => m.name),
    },
    plant_block: {
      block_id: 'plant',
      states: plant.states,
      inputs: plant.inputs,
      parameters: plant.parameters.map((p) => ({ name: p.name, value: p.value })),
      ode_expressions: plant.odeExpressions,
      measurement_expressions: plant.measurementExpressions,
      measurement_names: plant.measurementNames.map((m) => m.name),
    },
    mhe_block: {
      block_id: mhe.label,
      horizon: mhe.horizon,
      dt: mhe.dt,
      process_noise: mhe.processNoise,
      measurement_noise: mhe.measurementNoise,
      arrival_cost: mhe.arrivalCost,
      initial_guess: mhe.initialGuess,
    },
    mpc_block: {
      block_id: mpc.label,
      horizon: mpc.horizon,
      dt: mpc.dt,
      t_end: mpc.tEnd,
      initial_conditions: mpc.initialConditions,
      state_weights: mpc.stateWeights,
      input_weights: mpc.inputWeights,
      state_ref: mpc.stateRef,
      input_ref: mpc.inputRef,
      state_lb: mpc.stateLb,
      state_ub: mpc.stateUb,
      input_lb: mpc.inputLb,
      input_ub: mpc.inputUb,
    },
  };
}

export async function postMheMpc(req: MheMpcRequest): Promise<string> {
  const resp = await apiClient.post<{ run_id: string }>('/mhe-mpc', req);
  return resp.data.run_id;
}

export async function deleteMheMpc(runId: string): Promise<void> {
  await apiClient.delete(`/mhe-mpc/${runId}`);
}

// ── Predict API ───────────────────────────────────────────────────────────────

interface PredictRequest {
  csv_content: string;
  input_cols: string[];
  model_state: {
    layers: { units: number; activation: string }[];
    weights: number[][][];
    biases: number[][];
    x_mean: number[];
    x_std: number[];
    y_mean: number[];
    y_std: number[];
    input_cols: string[];
    output_cols: string[];
  };
}

export function buildPredictRequest(data: DataBlockData, model: TrainedModelState): PredictRequest {
  return {
    csv_content: data.csvContent,
    input_cols: data.inputCols,
    model_state: {
      layers: model.layers,
      weights: model.weights,
      biases: model.biases,
      x_mean: model.xMean,
      x_std: model.xStd,
      y_mean: model.yMean,
      y_std: model.yStd,
      input_cols: model.inputCols,
      output_cols: model.outputCols,
    },
  };
}

export async function postPredict(
  req: PredictRequest
): Promise<{ series: { t: number; values: Record<string, number> }[] }> {
  const resp = await apiClient.post<{ series: { t: number; values: Record<string, number> }[] }>(
    '/predict',
    req
  );
  return resp.data;
}

// ── Evaluate API ──────────────────────────────────────────────────────────────

interface EvaluateRequest {
  csv_content: string;
  input_cols: string[];
  output_defs: { name: string; expr: string }[];
}

export async function postEvaluate(
  req: EvaluateRequest
): Promise<{ series: { t: number; values: Record<string, number> }[] }> {
  const resp = await apiClient.post<{ series: { t: number; values: Record<string, number> }[] }>(
    '/evaluate',
    req
  );
  return resp.data;
}

// ── Validate API ──────────────────────────────────────────────────────────────

export async function validateEquations(
  states: BackendVariable[],
  inputs: BackendVariable[],
  parameters: BackendParameter[],
  odeExpressions: string[]
): Promise<{ valid: boolean; error?: string }> {
  const resp = await apiClient.post<{ valid: boolean; error?: string }>(
    '/validate/equations',
    { states, inputs, parameters, ode_expressions: odeExpressions }
  );
  return resp.data;
}
