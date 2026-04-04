import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useSimulationStore } from '../store/simulationStore';
import { useMhe } from '../hooks/useMhe';
import type { MheBlockData } from '../types/blocks';

export function MheNode({ id, data: _data, selected }: NodeProps) {
  const data = _data as unknown as MheBlockData;
  const { run, stop } = useMhe(id);
  const runState = useSimulationStore((s) => s.runs[id]);
  const queue = useSimulationStore((s) => s.queue);
  const status = runState?.status ?? 'idle';
  const isRunning = status === 'running';
  const isQueued = status === 'queued';
  const queuePos = queue.indexOf(id) + 1;

  const L = data.flipped ? Position.Right : Position.Left;
  const R = data.flipped ? Position.Left : Position.Right;

  return (
    <div
      className={`rounded-lg border-2 min-w-[170px] shadow-lg overflow-hidden transition-all ${
        selected ? 'border-fuchsia-400' : data.configured ? 'border-fuchsia-600' : 'border-stone-600'
      }`}
    >
      {/* Header */}
      <div className="bg-fuchsia-700 px-3 py-1.5 flex items-center gap-2">
        <span className="text-xs font-bold text-white uppercase tracking-wider">MHE</span>
        {data.configured && status === 'idle' && (
          <span className="ml-auto w-2 h-2 rounded-full bg-green-400" title="Configured" />
        )}
        {isRunning && <span className="ml-auto text-xs text-fuchsia-200 animate-pulse">estimating</span>}
        {isQueued && <span className="ml-auto text-xs text-fuchsia-300">#{queuePos} queued</span>}
        {status === 'completed' && <span className="ml-auto text-xs text-green-300">done</span>}
        {status === 'failed' && <span className="ml-auto text-xs text-rose-300">error</span>}
      </div>

      {/* Body */}
      <div className="bg-stone-800 px-3 py-2 text-xs text-stone-300 space-y-1">
        <div className="font-semibold text-white truncate">{data.label}</div>
        <div className="text-stone-400">
          N={data.horizon} &nbsp;|&nbsp; dt={data.dt}
        </div>
        {status === 'failed' && runState?.error && (
          <div className="text-rose-400 truncate" title={runState.error}>{runState.error}</div>
        )}
        {status === 'completed' && runState && (
          <div className="text-green-400">{runState.series.length} steps estimated</div>
        )}
      </div>

      {/* Run / Stop */}
      <div className="bg-stone-900 px-3 py-2">
        {isRunning ? (
          <button
            onClick={(e) => { e.stopPropagation(); stop(); }}
            className="w-full flex items-center justify-center gap-1.5 py-1 rounded text-xs font-semibold bg-rose-700 hover:bg-rose-600 text-white transition-colors"
          >
            <span className="w-2 h-2 rounded-sm bg-white inline-block" />
            Stop
          </button>
        ) : isQueued ? (
          <button
            onClick={(e) => { e.stopPropagation(); stop(); }}
            className="w-full py-1 rounded text-xs font-semibold bg-stone-700 hover:bg-stone-600 text-stone-300 transition-colors"
          >
            Cancel (#{queuePos})
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); run(); }}
            disabled={!data.configured}
            className={`w-full flex items-center justify-center gap-1.5 py-1 rounded text-xs font-semibold transition-colors ${
              data.configured
                ? 'bg-fuchsia-700 hover:bg-fuchsia-600 text-white'
                : 'bg-stone-700 text-stone-500 cursor-not-allowed'
            }`}
            title={!data.configured ? 'Configure the MHE block first' : 'Run state estimation'}
          >
            <span className="w-0 h-0 border-y-3 border-y-transparent border-l-5 border-l-white inline-block" />
            Run
          </button>
        )}
      </div>

      {/* Model input — top left */}
      <Handle
        type="target"
        position={L}
        id="mhe-model-in"
        style={{ top: '33%' }}
        className="!w-3 !h-3 !bg-rose-400 !border-2 !border-stone-800"
        title="Prediction model input"
      />
      {/* Data input — bottom left */}
      <Handle
        type="target"
        position={L}
        id="mhe-data-in"
        style={{ top: '67%' }}
        className="!w-3 !h-3 !bg-sky-400 !border-2 !border-stone-800"
        title="Measurement data input"
      />
      {/* Estimated states output — right */}
      <Handle
        type="source"
        position={R}
        id="mhe-states-out"
        className="!w-3 !h-3 !bg-fuchsia-300 !border-2 !border-stone-800"
        title="Estimated states output"
      />
    </div>
  );
}
