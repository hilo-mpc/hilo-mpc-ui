import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useSimulationStore } from '../store/simulationStore';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import type { PlotBlockData } from '../types/blocks';

export function PlotNode({ data, selected }: NodeProps<PlotBlockData>) {
  const series = useSimulationStore((s) => s.series);
  const status = useSimulationStore((s) => s.status);
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
        position={Position.Left}
        id="plot-data-in"
        className="!w-3 !h-3 !bg-orange-400 !border-2 !border-stone-800"
        title="Connect Simulation results here"
      />
    </div>
  );
}
