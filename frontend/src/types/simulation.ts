export interface TimeSeriesPoint {
  t: number;
  values: Record<string, number>;
}

export type RunStatus = 'idle' | 'running' | 'completed' | 'failed';
