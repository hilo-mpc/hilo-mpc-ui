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
        selected ? 'border-violet-400' : data.configured ? 'border-violet-600' : 'border-slate-600'
      }`}
      style={{ width: 340 }}
    >
      {/* Header */}
      <div className="bg-violet-700 px-3 py-1.5 flex items-center gap-2">
        <span className="text-xs font-bold text-white uppercase tracking-wider">Plot</span>
        {status === 'running' && (
          <span className="ml-auto text-xs text-violet-200 animate-pulse">live</span>
        )}
        {data.configured && status !== 'running' && (
          <span className="ml-auto w-2 h-2 rounded-full bg-green-400" />
        )}
      </div>

      {/* Chart or placeholder */}
      <div className="bg-slate-900 p-2">
        {hasData && data.yAxes.length > 0 ? (
          <TimeSeriesChart series={series} yAxes={data.yAxes} height={160} />
        ) : (
          <div className="h-[160px] flex items-center justify-center text-xs text-slate-500 italic">
            {data.yAxes.length === 0 ? 'Select variables in the panel' : 'Waiting for data…'}
          </div>
        )}
      </div>

      {/* Label below chart */}
      {data.title && (
        <div className="bg-slate-800 px-3 py-1 text-xs text-slate-400 text-center truncate">
          {data.title}
        </div>
      )}

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="plot-data-in"
        className="!w-3 !h-3 !bg-violet-400 !border-2 !border-slate-800"
        title="Connect Simulation results here"
      />
    </div>
  );
}
