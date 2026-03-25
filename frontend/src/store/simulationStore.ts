import { create } from 'zustand';
import type { TimeSeriesPoint, RunStatus } from '../types/simulation';

interface SimulationState {
  status: RunStatus;
  runId: string | null;
  series: TimeSeriesPoint[];
  error: string | null;
  elapsedSeconds: number | null;

  startRun: (runId: string) => void;
  appendPoint: (point: TimeSeriesPoint) => void;
  completeRun: (elapsed: number) => void;
  failRun: (error: string) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  status: 'idle',
  runId: null,
  series: [],
  error: null,
  elapsedSeconds: null,

  startRun: (runId) =>
    set({ status: 'running', runId, series: [], error: null, elapsedSeconds: null }),

  appendPoint: (point) =>
    set((s) => ({ series: [...s.series, point] })),

  completeRun: (elapsed) =>
    set({ status: 'completed', elapsedSeconds: elapsed }),

  failRun: (error) =>
    set({ status: 'failed', error }),

  reset: () =>
    set({ status: 'idle', runId: null, series: [], error: null, elapsedSeconds: null }),
}));
