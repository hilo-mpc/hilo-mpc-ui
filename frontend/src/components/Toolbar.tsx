import { useSimulationStore } from '../store/simulationStore';
import { useDiagramStore } from '../store/diagramStore';
import { useProjectStore } from '../store/projectStore';
import { useDiagramPersist } from '../hooks/useDiagramPersist';

interface Props {
  projectName: string;
  onBack: () => void;
}

export function Toolbar({ projectName, onBack }: Props) {
  const { currentProjectId, saveDiagram } = useProjectStore();
  const queue = useSimulationStore((s) => s.queue);
  const activeNodeId = useSimulationStore((s) => s.activeNodeId);
  const { exportFile, importFile } = useDiagramPersist();

  function handleSave() {
    if (!currentProjectId) return;
    const { nodes, edges } = useDiagramStore.getState();
    saveDiagram(currentProjectId, nodes, edges);
  }

  const runningCount = activeNodeId ? 1 + queue.length : 0;

  return (
    <header className="h-12 bg-stone-900 border-b border-stone-700 flex items-center px-4 gap-3 shrink-0">
      {/* Back to projects */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-stone-400 hover:text-stone-100 text-xs transition-colors"
        title="Save and go back to projects"
      >
        ← Projects
      </button>

      <div className="w-px h-6 bg-stone-700" />

      {/* Project name */}
      <span className="text-stone-300 text-sm font-medium truncate max-w-[160px]" title={projectName}>
        {projectName}
      </span>

      {/* Queue indicator */}
      {runningCount > 0 && (
        <>
          <div className="w-px h-6 bg-stone-700" />
          <span className="text-xs text-amber-400 animate-pulse">
            {runningCount === 1 ? '1 simulation running' : `${runningCount} simulations running`}
          </span>
        </>
      )}

      <div className="flex-1" />

      {/* Save to project */}
      <button
        onClick={handleSave}
        className="px-2.5 py-1.5 rounded text-xs text-stone-300 hover:text-white hover:bg-stone-700 transition-colors"
        title="Save to project"
      >
        Save
      </button>

      <div className="w-px h-6 bg-stone-700" />

      {/* File import / export */}
      <button
        onClick={importFile}
        className="px-2.5 py-1.5 rounded text-xs text-stone-500 hover:text-stone-300 hover:bg-stone-700 transition-colors"
        title="Import .hilo file"
      >
        Import
      </button>
      <button
        onClick={exportFile}
        className="px-2.5 py-1.5 rounded text-xs text-stone-500 hover:text-stone-300 hover:bg-stone-700 transition-colors"
        title="Export .hilo file"
      >
        Export
      </button>
    </header>
  );
}
