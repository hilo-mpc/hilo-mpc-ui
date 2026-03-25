import { getWsBaseUrl } from './client';

export type WsFrame =
  | { type: 'step'; t: number; values: Record<string, number> }
  | { type: 'complete'; elapsed_seconds: number }
  | { type: 'error'; message: string };

export class SimulationWebSocket {
  private ws: WebSocket | null = null;
  private runId: string;

  constructor(
    runId: string,
    private onFrame: (frame: WsFrame) => void,
    private onClose: () => void
  ) {
    this.runId = runId;
  }

  connect(): void {
    const url = `${getWsBaseUrl()}/ws/simulate/${this.runId}`;
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
