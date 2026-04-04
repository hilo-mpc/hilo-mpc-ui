import { apiClient } from './client';
import type { ModelBlockData, SimulationBlockData, PlotBlockData, MpcBlockData, PlantBlockData, DataBlockData, AnnBlockData, InputScheduleEntry } from '../types/blocks';

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
