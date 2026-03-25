import { useSimulationStore } from '../store/simulationStore';
import { useDiagramStore } from '../store/diagramStore';
import { useSimulation } from '../hooks/useSimulation';
import { useDiagramPersist } from '../hooks/useDiagramPersist';

export function Toolbar() {
  const status = useSimulationStore((s) => s.status);
  const error = useSimulationStore((s) => s.error);
  const nodes = useDiagramStore((s) => s.nodes);

  // Find the simulation node (there should be one per diagram for Stage 1)
  const simNode = nodes.find((n) => n.data.blockType === 'simulation');
  const { run, stop } = useSimulation(simNode?.id ?? '');
  const { save, load } = useDiagramPersist();

  const isRunning = status === 'running';
  const canRun = !!simNode && !isRunning;

  return (
    <header className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-3 shrink-0">
      {/* Logo */}
      <span className="text-white font-bold text-sm tracking-tight mr-2">
        HILO<span className="text-blue-400">-MPC</span> UI
      </span>

      <div className="w-px h-6 bg-slate-700" />

      {/* Run / Stop */}
      {isRunning ? (
        <button
          onClick={stop}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-red-700 hover:bg-red-600 text-white transition-colors"
        >
          <span className="w-2 h-2 rounded-sm bg-white inline-block" />
          Stop
        </button>
      ) : (
        <button
          onClick={run}
          disabled={!canRun}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
            canRun
              ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
          title={!simNode ? 'Add a Simulation block first' : 'Run simulation'}
        >
          <span className="w-0 h-0 border-y-4 border-y-transparent border-l-6 border-l-white inline-block" />
          Run
        </button>
      )}

      {/* Status indicator */}
      {status === 'running' && (
        <span className="text-xs text-emerald-400 animate-pulse">Simulating…</span>
      )}
      {status === 'completed' && (
        <span className="text-xs text-emerald-400">Done</span>
      )}
      {status === 'failed' && (
        <span className="text-xs text-red-400">
          Error: {error?.slice(0, 60)}
        </span>
      )}

      <div className="flex-1" />

      {/* Save / Load */}
      <button
        onClick={load}
        className="px-2.5 py-1.5 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
      >
        Open
      </button>
      <button
        onClick={save}
        className="px-2.5 py-1.5 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
      >
        Save
      </button>
    </header>
  );
}
