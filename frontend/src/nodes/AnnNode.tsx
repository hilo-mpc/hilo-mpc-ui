import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useSimulationStore } from '../store/simulationStore';
import { useAnn } from '../hooks/useAnn';
import type { AnnBlockData } from '../types/blocks';

export function AnnNode({ id, data, selected }: NodeProps<AnnBlockData>) {
  const { train, stop } = useAnn(id);
  const runState = useSimulationStore((s) => s.runs[id]);
  const queue = useSimulationStore((s) => s.queue);
  const status = runState?.status ?? 'idle';
  const isRunning = status === 'running';
  const isQueued = status === 'queued';
  const queuePos = queue.indexOf(id) + 1;

  const L = data.flipped ? Position.Right : Position.Left;
  const R = data.flipped ? Position.Left : Position.Right;

  // Build architecture summary
  const arch = data.layers.map((l) => l.units).join(' → ');
  const lastPoint = runState?.series[runState.series.length - 1];
  const currentEpoch = lastPoint ? Math.round(lastPoint.t) : 0;

  return (
    <div
      className={`rounded-lg border-2 min-w-[180px] shadow-lg overflow-hidden transition-all ${
        selected ? 'border-indigo-400' : data.configured ? 'border-indigo-600' : 'border-stone-600'
      }`}
    >
      {/* Header */}
      <div className="bg-indigo-700 px-3 py-1.5 flex items-center gap-2">
        <span className="text-xs font-bold text-white uppercase tracking-wider">ANN</span>
        {data.configured && status === 'idle' && (
          <span className="ml-auto w-2 h-2 rounded-full bg-green-400" title="Configured" />
        )}
        {isRunning && <span className="ml-auto text-xs text-indigo-200 animate-pulse">training</span>}
        {isQueued && <span className="ml-auto text-xs text-indigo-300">#{queuePos} queued</span>}
        {status === 'completed' && <span className="ml-auto text-xs text-green-300">done</span>}
        {status === 'failed' && <span className="ml-auto text-xs text-rose-300">error</span>}
      </div>

      {/* Body */}
      <div className="bg-stone-800 px-3 py-2 text-xs text-stone-300 space-y-1">
        <div className="font-semibold text-white truncate">{data.label}</div>
        {data.layers.length > 0 && (
          <div className="text-stone-400 font-mono truncate">{arch}</div>
        )}
        <div className="text-stone-400">
          {data.epochs} epochs &nbsp;|&nbsp; lr={data.learningRate}
        </div>
        {isRunning && (
          <div className="text-indigo-400 tabular-nums">
            Epoch {currentEpoch}/{data.epochs}
            {lastPoint?.values.train_loss != null && (
              <span> · loss {(lastPoint.values.train_loss as number).toExponential(2)}</span>
            )}
          </div>
        )}
        {status === 'completed' && lastPoint && (
          <div className="text-green-400">
            Final loss {(lastPoint.values.train_loss as number).toExponential(2)}
          </div>
        )}
        {status === 'failed' && runState?.error && (
          <div className="text-rose-400 truncate" title={runState.error}>{runState.error}</div>
        )}
      </div>

      {/* Train / Stop */}
      <div className="bg-stone-900 px-3 py-2 flex gap-2">
        {isRunning ? (
          <button
            onClick={(e) => { e.stopPropagation(); stop(); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1 rounded text-xs font-semibold bg-rose-700 hover:bg-rose-600 text-white transition-colors"
          >
            <span className="w-2 h-2 rounded-sm bg-white inline-block" />
            Stop
          </button>
        ) : isQueued ? (
          <button
            onClick={(e) => { e.stopPropagation(); stop(); }}
            className="flex-1 py-1 rounded text-xs font-semibold bg-stone-700 hover:bg-stone-600 text-stone-300 transition-colors"
          >
            Cancel (#{queuePos})
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); train(); }}
            disabled={!data.configured}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded text-xs font-semibold transition-colors ${
              data.configured
                ? 'bg-indigo-700 hover:bg-indigo-600 text-white'
                : 'bg-stone-700 text-stone-500 cursor-not-allowed'
            }`}
            title={!data.configured ? 'Connect a Data block first' : 'Start training'}
          >
            <span className="w-0 h-0 border-y-3 border-y-transparent border-l-5 border-l-white inline-block" />
            Train
          </button>
        )}
      </div>

      <Handle type="target" position={L} id="ann-data-in"
        className="!w-3 !h-3 !bg-sky-400 !border-2 !border-stone-800" title="Data input" />
      <Handle type="source" position={R} id="ann-results-out"
        className="!w-3 !h-3 !bg-indigo-300 !border-2 !border-stone-800" title="Training results" />
    </div>
  );
}
