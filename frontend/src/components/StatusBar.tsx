import { useBackendHealth } from '../hooks/useBackendHealth';
import { useSimulationStore } from '../store/simulationStore';

export function StatusBar() {
  const { status: health, hiloVersion } = useBackendHealth();
  const activeNodeId = useSimulationStore((s) => s.activeNodeId);
  const queue = useSimulationStore((s) => s.queue);

  const totalRunning = activeNodeId ? 1 + queue.length : 0;

  return (
    <footer className="h-6 bg-stone-950 border-t border-stone-800 flex items-center px-4 gap-4 text-xs text-stone-500 shrink-0">
      <span className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            health === 'ok' ? 'bg-green-400' : health === 'error' ? 'bg-rose-400' : 'bg-amber-400'
          }`}
        />
        {health === 'ok' ? `Backend OK${hiloVersion ? ` · hilo-mpc ${hiloVersion}` : ''}` : 'Backend offline'}
      </span>

      {totalRunning > 0 && (
        <>
          <span className="w-px h-3 bg-stone-800" />
          <span className="text-amber-400 animate-pulse">
            {totalRunning === 1 ? '1 simulation running' : `${totalRunning} simulations (${queue.length} queued)`}
          </span>
        </>
      )}
    </footer>
  );
}
