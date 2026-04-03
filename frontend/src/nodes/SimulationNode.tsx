import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useSimulationStore } from '../store/simulationStore';
import { useSimulation } from '../hooks/useSimulation';
import type { SimulationBlockData } from '../types/blocks';

export function SimulationNode({ id, data, selected }: NodeProps<SimulationBlockData>) {
  const { run, stop } = useSimulation(id);
  const runState = useSimulationStore((s) => s.runs[id]);
  const queue = useSimulationStore((s) => s.queue);
  const status = runState?.status ?? 'idle';
  const isRunning = status === 'running';
  const isQueued = status === 'queued';
  const queuePos = queue.indexOf(id) + 1;

  return (
    <div
      className={`rounded-lg border-2 min-w-[170px] shadow-lg overflow-hidden transition-all ${
        selected ? 'border-amber-400' : data.configured ? 'border-amber-600' : 'border-stone-600'
      }`}
    >
      {/* Header */}
      <div className="bg-amber-700 px-3 py-1.5 flex items-center gap-2">
        <span className="text-xs font-bold text-white uppercase tracking-wider">Simulation</span>
        {data.configured && status === 'idle' && (
          <span className="ml-auto w-2 h-2 rounded-full bg-green-400" title="Configured" />
        )}
        {isRunning && (
          <span className="ml-auto text-xs text-amber-200 animate-pulse">running</span>
        )}
        {isQueued && (
          <span className="ml-auto text-xs text-amber-300">#{queuePos} queued</span>
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
          dt = {data.dt}s &nbsp;|&nbsp; T = {data.tEnd}s
        </div>
        <div className="text-stone-400">Solver: {data.solver}</div>

        {/* Status line */}
        {isRunning && (
          <div className="text-amber-400 tabular-nums">
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

      {/* Run / Stop / Queue-cancel button */}
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
                ? 'bg-amber-700 hover:bg-amber-600 text-white'
                : 'bg-stone-700 text-stone-500 cursor-not-allowed'
            }`}
            title={!data.configured ? 'Configure simulation first' : 'Run simulation'}
          >
            <span className="w-0 h-0 border-y-3 border-y-transparent border-l-5 border-l-white inline-block" />
            Run
          </button>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="sim-model-in"
        style={{ top: '35%' }}
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-stone-800"
        title="Connect Model block here"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="sim-results-out"
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-stone-800"
        title="Simulation results"
      />
    </div>
  );
}
