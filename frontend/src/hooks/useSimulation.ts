import { useCallback, useRef } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { useSimulationStore } from '../store/simulationStore';
import { buildSimulateRequest, postSimulate, deleteSimulate } from '../api/simulation';
import { SimulationWebSocket } from '../api/websocket';
import type { ModelBlockData, SimulationBlockData, PlotBlockData } from '../types/blocks';

function findConnectedModel(
  simNodeId: string,
  nodes: ReturnType<typeof useDiagramStore.getState>['nodes'],
  edges: ReturnType<typeof useDiagramStore.getState>['edges']
): ModelBlockData | null {
  const edge = edges.find(
    (e) => e.target === simNodeId && e.targetHandle === 'sim-model-in'
  );
  if (!edge) return null;
  const modelNode = nodes.find((n) => n.id === edge.source);
  if (!modelNode || modelNode.data.blockType !== 'model') return null;
  return modelNode.data as ModelBlockData;
}

function findConnectedPlots(
  simNodeId: string,
  nodes: ReturnType<typeof useDiagramStore.getState>['nodes'],
  edges: ReturnType<typeof useDiagramStore.getState>['edges']
): PlotBlockData[] {
  return edges
    .filter((e) => e.source === simNodeId && e.sourceHandle === 'sim-results-out')
    .map((e) => nodes.find((n) => n.id === e.target))
    .filter((n) => n?.data.blockType === 'plot')
    .map((n) => n!.data as PlotBlockData);
}

export function useSimulation(simNodeId: string) {
  const wsRef = useRef<SimulationWebSocket | null>(null);
  const { nodes, edges } = useDiagramStore.getState();
  const simStore = useSimulationStore.getState();

  const run = useCallback(async () => {
    const { nodes, edges } = useDiagramStore.getState();
    const simNode = nodes.find((n) => n.id === simNodeId);
    if (!simNode || simNode.data.blockType !== 'simulation') return;

    const simData = simNode.data as SimulationBlockData;
    const modelData = findConnectedModel(simNodeId, nodes, edges);
    const plotData = findConnectedPlots(simNodeId, nodes, edges);

    if (!modelData) {
      useSimulationStore.getState().failRun('No Model block connected to Simulation block.');
      return;
    }

    const req = buildSimulateRequest(
      simNodeId,
      modelData,
      simData,
      plotData
    );

    let runId: string;
    try {
      runId = await postSimulate(req);
    } catch (err: any) {
      useSimulationStore.getState().failRun(err?.message ?? 'Failed to start simulation');
      return;
    }

    useSimulationStore.getState().startRun(runId);

    wsRef.current?.close();
    wsRef.current = new SimulationWebSocket(
      runId,
      (frame) => {
        if (frame.type === 'step') {
          useSimulationStore.getState().appendPoint({ t: frame.t, values: frame.values });
        } else if (frame.type === 'complete') {
          useSimulationStore.getState().completeRun(frame.elapsed_seconds);
        } else if (frame.type === 'error') {
          useSimulationStore.getState().failRun(frame.message);
        }
      },
      () => {
        // WebSocket closed
      }
    );
    wsRef.current.connect();
  }, [simNodeId]);

  const stop = useCallback(async () => {
    const { runId } = useSimulationStore.getState();
    if (runId) {
      wsRef.current?.close();
      try {
        await deleteSimulate(runId);
      } catch {}
      useSimulationStore.getState().failRun('Stopped by user');
    }
  }, []);

  return { run, stop };
}
