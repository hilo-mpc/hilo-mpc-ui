import { useSimulationStore } from '../store/simulationStore';
import { useUIStore } from '../store/uiStore';

interface Props {
  projectName: string;
  onBack: () => void;
}

export function Toolbar({ projectName, onBack }: Props) {
  const activeNodeId = useSimulationStore((s) => s.activeNodeId);
  const queue = useSimulationStore((s) => s.queue);
  const savedFlash = useUIStore((s) => s.savedFlash);

  const runningCount = activeNodeId ? 1 + queue.length : 0;

  return (
    <header className="h-10 bg-stone-900 border-b border-stone-800 flex items-center px-4 gap-3 shrink-0">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-stone-400 hover:text-stone-100 text-xs transition-colors"
        title="Back to projects"
      >
        ← Projects
      </button>

      <div className="w-px h-5 bg-stone-700" />

      <span className="text-stone-300 text-sm font-medium truncate max-w-[200px]" title={projectName}>
        {projectName}
      </span>

      {runningCount > 0 && (
        <>
          <div className="w-px h-5 bg-stone-700" />
          <span className="text-xs text-amber-400 animate-pulse">
            {runningCount === 1 ? '1 simulation running' : `${runningCount} simulations running`}
          </span>
        </>
      )}

      <div className="flex-1" />

      {savedFlash && (
        <span className="text-xs text-green-400 transition-opacity">Saved</span>
      )}
    </header>
  );
}
