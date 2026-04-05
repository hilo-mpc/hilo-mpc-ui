import { create } from 'zustand';
import type { TimeSeriesPoint, SimRun } from '../types/simulation';
import { useLogStore } from './logStore';

function defaultRun(): SimRun {
  return { status: 'idle', runId: null, series: [], error: null, elapsedSeconds: null };
}

interface SimulationStore {
  runs: Record<string, SimRun>;  // nodeId → run state
  activeNodeId: string | null;   // node currently executing
  queue: string[];               // nodeIds waiting (in order)

  enqueue: (nodeId: string) => void;
  setRunId: (nodeId: string, runId: string) => void;
  appendPoint: (nodeId: string, point: TimeSeriesPoint) => void;
  completeRun: (nodeId: string, elapsed: number) => void;
  failRun: (nodeId: string, error: string) => void;
  cancelQueued: (nodeId: string) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationStore>((set, get) => {
  function advance() {
    const { queue } = get();
    const [next, ...rest] = queue;
    if (next) {
      set((s) => ({
        activeNodeId: next,
        queue: rest,
        runs: { ...s.runs, [next]: { ...defaultRun(), status: 'running' } },
      }));
    } else {
      set({ activeNodeId: null, queue: [] });
    }
  }

  return {
    runs: {},
    activeNodeId: null,
    queue: [],

    enqueue: (nodeId) =>
      set((s) => {
        const existing = s.runs[nodeId];
        if (existing?.status === 'queued' || existing?.status === 'running') return s;

        useLogStore.getState().log('info', 'Run started', nodeId);

        if (s.activeNodeId === null) {
          // Nothing running — start immediately
          return {
            activeNodeId: nodeId,
            runs: { ...s.runs, [nodeId]: { ...defaultRun(), status: 'running' } },
          };
        }
        // Something already running — queue it
        return {
          queue: [...s.queue, nodeId],
          runs: { ...s.runs, [nodeId]: { ...defaultRun(), status: 'queued' } },
        };
      }),

    setRunId: (nodeId, runId) =>
      set((s) => ({
        runs: { ...s.runs, [nodeId]: { ...s.runs[nodeId], runId } },
      })),

    appendPoint: (nodeId, point) =>
      set((s) => ({
        runs: {
          ...s.runs,
          [nodeId]: { ...s.runs[nodeId], series: [...(s.runs[nodeId]?.series ?? []), point] },
        },
      })),

    completeRun: (nodeId, elapsed) => {
      set((s) => ({
        runs: {
          ...s.runs,
          [nodeId]: { ...s.runs[nodeId], status: 'completed', elapsedSeconds: elapsed },
        },
      }));
      useLogStore.getState().log('success', `Run completed in ${elapsed.toFixed(2)}s`, nodeId);
      advance();
    },

    failRun: (nodeId, error) => {
      set((s) => ({
        runs: {
          ...s.runs,
          [nodeId]: { ...s.runs[nodeId], status: 'failed', error },
        },
      }));
      if (error !== 'Cancelled by user') {
        useLogStore.getState().log('error', error, nodeId);
      }
      advance();
    },

    cancelQueued: (nodeId) =>
      set((s) => ({
        queue: s.queue.filter((id) => id !== nodeId),
        runs: { ...s.runs, [nodeId]: defaultRun() },
      })),

    reset: () => set({ runs: {}, activeNodeId: null, queue: [] }),
  };
});
