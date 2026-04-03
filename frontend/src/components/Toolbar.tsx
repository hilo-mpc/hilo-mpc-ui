import { useSimulationStore } from '../store/simulationStore';
import { useDiagramStore } from '../store/diagramStore';
import { useProjectStore } from '../store/projectStore';
import { useSimulation } from '../hooks/useSimulation';
import { useDiagramPersist } from '../hooks/useDiagramPersist';

interface Props {
  projectName: string;
  onBack: () => void;
}

export function Toolbar({ projectName, onBack }: Props) {
  const status = useSimulationStore((s) => s.status);
  const error = useSimulationStore((s) => s.error);
  const nodes = useDiagramStore((s) => s.nodes);
  const { currentProjectId, saveDiagram } = useProjectStore();

  const simNode = nodes.find((n) => n.data.blockType === 'simulation');
  const { run, stop } = useSimulation(simNode?.id ?? '');
  const { exportFile, importFile } = useDiagramPersist();

  const isRunning = status === 'running';
  const canRun = !!simNode && !isRunning;

  function handleSave() {
    if (!currentProjectId) return;
    const { nodes, edges } = useDiagramStore.getState();
    saveDiagram(currentProjectId, nodes, edges);
  }

  return (
    <header className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-3 shrink-0">
      {/* Back to projects */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-slate-400 hover:text-white text-xs transition-colors"
        title="Save and go back to projects"
      >
        ← Projects
      </button>

      <div className="w-px h-6 bg-slate-700" />

      {/* Project name */}
      <span className="text-slate-300 text-sm font-medium truncate max-w-[160px]" title={projectName}>
        {projectName}
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

      {/* Save to project */}
      <button
        onClick={handleSave}
        className="px-2.5 py-1.5 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
        title="Save to project"
      >
        Save
      </button>

      <div className="w-px h-6 bg-slate-700" />

      {/* File import / export */}
      <button
        onClick={importFile}
        className="px-2.5 py-1.5 rounded text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
        title="Import .hilo file"
      >
        Import
      </button>
      <button
        onClick={exportFile}
        className="px-2.5 py-1.5 rounded text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
        title="Export .hilo file"
      >
        Export
      </button>
    </header>
  );
}
