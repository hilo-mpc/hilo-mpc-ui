import type { NodeTypes } from '@xyflow/react';
import { ModelNode } from './ModelNode';
import { SimulationNode } from './SimulationNode';
import { PlotNode } from './PlotNode';

export const nodeTypes: NodeTypes = {
  model: ModelNode as any,
  simulation: SimulationNode as any,
  plot: PlotNode as any,
};
