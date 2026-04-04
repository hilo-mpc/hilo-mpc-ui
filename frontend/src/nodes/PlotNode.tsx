import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useSimulationStore } from '../store/simulationStore';
import { useDiagramStore } from '../store/diagramStore';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import type { PlotBlockData } from '../types/blocks';

export function PlotNode({ id, data, selected }: NodeProps<PlotBlockData>) {
  const In = data.flipped ? Position.Right : Position.Left;
  const edges = useDiagramStore((s) => s.edges);
  const nodes = useDiagramStore((s) => s.nodes);

  // Find source node connected to plot-data-in
  const plotEdge = edges.find((e) => e.target === id && e.targetHandle === 'plot-data-in');
  const sourceNode = plotEdge ? nodes.find((n) => n.id === plotEdge.source) : undefined;

  // If source is a Plant (via plant-states-out), find the MPC that controls it
  let runNodeId = plotEdge?.source ?? null;
  if (sourceNode?.data?.blockType === 'plant') {
    const mpcEdge = edges.find(
      (e) => e.source === runNodeId && e.sourceHandle === 'plant-measurement-out'
    );
    if (mpcEdge) runNodeId = mpcEdge.target;
  }

  const series = useSimulationStore((s) => (runNodeId ? (s.runs[runNodeId]?.series ?? []) : []));
  const status = useSimulationStore((s) => (runNodeId ? (s.runs[runNodeId]?.status ?? 'idle') : 'idle'));

  const hasData = series.length > 0;

  return (
    <div
      className={`rounded-lg border-2 min-w-[220px] shadow-lg overflow-hidden transition-all ${
        selected ? 'border-orange-400' : data.configured ? 'border-orange-600' : 'border-stone-600'
      }`}
      style={{ width: 340 }}
    >
      <div className="bg-orange-700 px-3 py-1.5 flex items-center gap-2">
        <span className="text-xs font-bold text-white uppercase tracking-wider">Plot</span>
        {status === 'running' && (
          <span className="ml-auto text-xs text-orange-200 animate-pulse">live</span>
        )}
        {data.configured && status !== 'running' && (
          <span className="ml-auto w-2 h-2 rounded-full bg-green-400" />
        )}
      </div>

      <div className="bg-stone-900 p-2">
        {hasData && data.yAxes.length > 0 ? (
          <TimeSeriesChart series={series} yAxes={data.yAxes} height={160} />
        ) : (
          <div className="h-[160px] flex items-center justify-center text-xs text-stone-500 italic">
            {data.yAxes.length === 0 ? 'Select variables in the panel' : 'Waiting for data…'}
          </div>
        )}
      </div>

      {data.title && (
        <div className="bg-stone-800 px-3 py-1 text-xs text-stone-400 text-center truncate">
          {data.title}
        </div>
      )}

      <Handle
        type="target"
        position={In}
        id="plot-data-in"
        className="!w-3 !h-3 !bg-orange-400 !border-2 !border-stone-800"
        title="Connect Simulation, MPC, or Plant results here"
      />
    </div>
  );
}
