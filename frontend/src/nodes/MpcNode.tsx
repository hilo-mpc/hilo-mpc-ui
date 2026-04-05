import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useSimulationStore } from '../store/simulationStore';
import { useMpc } from '../hooks/useMpc';
import type { MpcBlockData } from '../types/blocks';
import { HandleTag } from './HandleTag';

export function MpcNode({ id, data, selected }: NodeProps<MpcBlockData>) {
  const L = data.flipped ? Position.Right : Position.Left;
  const R = data.flipped ? Position.Left : Position.Right;
  const sideL = data.flipped ? 'right' : 'left';
  const sideR = data.flipped ? 'left' : 'right';
  const { run, stop } = useMpc(id);
  const runState = useSimulationStore((s) => s.runs[id]);
  const queue = useSimulationStore((s) => s.queue);
  const status = runState?.status ?? 'idle';
  const isRunning = status === 'running';
  const isQueued = status === 'queued';
  const queuePos = queue.indexOf(id) + 1;

  return (
    <div className="relative min-w-[170px]">
      <div
        className={`rounded-lg border-2 shadow-lg overflow-hidden transition-all ${
          selected ? 'border-violet-400' : data.configured ? 'border-violet-600' : 'border-stone-600'
        }`}
      >
        {/* Header */}
        <div className="bg-violet-700 px-3 py-1.5 flex items-center gap-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider">MPC</span>
          {data.configured && status === 'idle' && (
            <span className="ml-auto w-2 h-2 rounded-full bg-green-400" title="Configured" />
          )}
          {isRunning && (
            <span className="ml-auto text-xs text-violet-200 animate-pulse">running</span>
          )}
          {isQueued && (
            <span className="ml-auto text-xs text-violet-300">#{queuePos} queued</span>
          )}
          {status === 'completed' && (
            <span className="ml-auto text-xs text-green-300">done</span>
          )}
          {status === 'failed' && (
            <span className="ml-auto text-xs text-rose-300">error</span>
          )}
        </div>

        {/* Body */}
        <div className="bg-stone-800 px-3 py-2 text-xs text-stone-300 space-y-1">
          <div className="font-semibold text-white truncate">{data.label}</div>
          <div className="text-stone-400">
            N = {data.horizon} &nbsp;|&nbsp; dt = {data.dt}s &nbsp;|&nbsp; T = {data.tEnd}s
          </div>

          {isRunning && (
            <div className="text-violet-400 tabular-nums">
              {(runState?.series.length ?? 0)} steps…
            </div>
          )}
          {status === 'completed' && runState?.elapsedSeconds != null && (
            <div className="text-green-400">
              {runState.series.length} steps in {runState.elapsedSeconds.toFixed(2)}s
            </div>
          )}
          {status === 'failed' && runState?.error && (
            <div className="text-rose-400 truncate" title={runState.error}>
              {runState.error}
            </div>
          )}
        </div>

        {/* Run / Stop / Cancel */}
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
              onClick={(e) => { e.stopPropagation(); run(); }}
              disabled={!data.configured}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded text-xs font-semibold transition-colors ${
                data.configured
                  ? 'bg-violet-700 hover:bg-violet-600 text-white'
                  : 'bg-stone-700 text-stone-500 cursor-not-allowed'
              }`}
              title={!data.configured ? 'Configure MPC first' : 'Run MPC'}
            >
              <span className="w-0 h-0 border-y-3 border-y-transparent border-l-5 border-l-white inline-block" />
              Run
            </button>
          )}
        </div>
      </div>

      {/* Handles */}
      <Handle type="target" position={L} id="mpc-model-in"
        style={{ top: '30%' }} className="!w-3 !h-3 !bg-rose-400 !border-2 !border-stone-800" />
      <Handle type="target" position={L} id="mpc-measurement-in"
        style={{ top: '70%' }} className="!w-3 !h-3 !bg-violet-400 !border-2 !border-stone-800" />
      <Handle type="source" position={R} id="mpc-control-out"
        style={{ top: '30%' }} className="!w-3 !h-3 !bg-teal-400 !border-2 !border-stone-800" />
      <Handle type="source" position={R} id="mpc-results-out"
        style={{ top: '70%' }} className="!w-3 !h-3 !bg-violet-300 !border-2 !border-stone-800" />

      {/* Tags */}
      <HandleTag nodeId={id} handleId="mpc-model-in"       label="Model"       side={sideL} top="30%" />
      <HandleTag nodeId={id} handleId="mpc-measurement-in" label="Plant · MHE" side={sideL} top="70%" />
      <HandleTag nodeId={id} handleId="mpc-control-out"    label="Plant"       side={sideR} top="30%" />
      <HandleTag nodeId={id} handleId="mpc-results-out"    label="Plot"        side={sideR} top="70%" />
    </div>
  );
}
