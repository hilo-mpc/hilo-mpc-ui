import { create } from 'zustand';
import type { TimeSeriesPoint } from '../types/simulation';

interface MlStore {
  predictions: Record<string, TimeSeriesPoint[]>;
  setPredictions: (nodeId: string, series: TimeSeriesPoint[]) => void;
  clearPredictions: (nodeId: string) => void;
}

export const useMlStore = create<MlStore>((set) => ({
  predictions: {},
  setPredictions: (nodeId, series) =>
    set((s) => ({ predictions: { ...s.predictions, [nodeId]: series } })),
  clearPredictions: (nodeId) =>
    set((s) => {
      const next = { ...s.predictions };
      delete next[nodeId];
      return { predictions: next };
    }),
}));
