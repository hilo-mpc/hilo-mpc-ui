import { useBackendHealth } from '../hooks/useBackendHealth';
import { useSimulationStore } from '../store/simulationStore';

export function StatusBar() {
  const { status: health, hiloVersion } = useBackendHealth();
  const simStatus = useSimulationStore((s) => s.status);
  const elapsed = useSimulationStore((s) => s.elapsedSeconds);
  const series = useSimulationStore((s) => s.series);

  return (
    <footer className="h-6 bg-slate-950 border-t border-slate-800 flex items-center px-4 gap-4 text-xs text-slate-500 shrink-0">
      {/* Backend health */}
      <span className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            health === 'ok' ? 'bg-green-400' : health === 'error' ? 'bg-red-400' : 'bg-yellow-400'
          }`}
        />
        {health === 'ok' ? `Backend OK${hiloVersion ? ` · hilo-mpc ${hiloVersion}` : ''}` : 'Backend offline'}
      </span>

      <span className="w-px h-3 bg-slate-800" />

      {/* Simulation status */}
      {simStatus !== 'idle' && (
        <span>
          {simStatus === 'running' && `${series.length} steps…`}
          {simStatus === 'completed' && `Completed — ${series.length} steps in ${elapsed?.toFixed(2)}s`}
          {simStatus === 'failed' && 'Simulation failed'}
        </span>
      )}
    </footer>
  );
}
