import { apiClient } from './client';
import type { ModelBlockData, SimulationBlockData, PlotBlockData, InputScheduleEntry } from '../types/blocks';

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
