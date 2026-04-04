import type { NodeTypes } from '@xyflow/react';
import { ModelNode } from './ModelNode';
import { SimulationNode } from './SimulationNode';
import { MpcNode } from './MpcNode';
import { PlantNode } from './PlantNode';
import { PlotNode } from './PlotNode';
import { DataNode } from './DataNode';
import { AnnNode } from './AnnNode';
import { FunctionNode } from './FunctionNode';

export const nodeTypes: NodeTypes = {
  model: ModelNode as any,
  simulation: SimulationNode as any,
  mpc: MpcNode as any,
  plant: PlantNode as any,
  plot: PlotNode as any,
  data: DataNode as any,
  ann: AnnNode as any,
  function: FunctionNode as any,
};
