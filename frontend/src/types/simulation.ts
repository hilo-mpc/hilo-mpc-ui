export interface TimeSeriesPoint {
  t: number;
  values: Record<string, number>;
}

export type RunStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed';

export interface SimRun {
  status: RunStatus;
  runId: string | null;
  series: TimeSeriesPoint[];
  error: string | null;
  elapsedSeconds: number | null;
}
