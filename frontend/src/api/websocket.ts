import { getWsBaseUrl } from './client';

interface TrainedModelStateRaw {
  layers: { units: number; activation: string }[];
  weights: number[][][];
  biases: number[][];
  x_mean: number[];
  x_std: number[];
  y_mean: number[];
  y_std: number[];
  input_cols: string[];
  output_cols: string[];
}

export type WsFrame =
  | { type: 'step'; t: number; values: Record<string, number> }
  | { type: 'complete'; elapsed_seconds: number; model_state?: TrainedModelStateRaw }
  | { type: 'error'; message: string }
  | { type: 'epoch'; epoch: number; train_loss: number; val_loss?: number };

export class SimulationWebSocket {
  private ws: WebSocket | null = null;
  private runId: string;

  constructor(
    runId: string,
    private onFrame: (frame: WsFrame) => void,
    private onClose: () => void,
    private wsPath: string = 'simulate'
  ) {
    this.runId = runId;
  }

  connect(): void {
    const url = `${getWsBaseUrl()}/ws/${this.wsPath}/${this.runId}`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data as string) as WsFrame;
        this.onFrame(frame);
      } catch {
        // ignore malformed frames
      }
    };

    this.ws.onclose = () => this.onClose();
    this.ws.onerror = (e) => {
      console.error('[ws] error', e);
      this.onClose();
    };
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }
}
