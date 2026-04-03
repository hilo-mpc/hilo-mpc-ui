import { useCallback, useEffect, useRef } from 'react';
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

export function useSimulation(nodeId: string) {
  const wsRef = useRef<SimulationWebSocket | null>(null);
  const startedRef = useRef(false);
  const activeNodeId = useSimulationStore((s) => s.activeNodeId);

  // Reactive: when it's this node's turn, start the simulation
  useEffect(() => {
    if (activeNodeId !== nodeId) {
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    async function start() {
      const { nodes, edges } = useDiagramStore.getState();
      const simNode = nodes.find((n) => n.id === nodeId);
      if (!simNode || simNode.data.blockType !== 'simulation') {
        useSimulationStore.getState().failRun(nodeId, 'Simulation block not found.');
        return;
      }

      const simData = simNode.data as SimulationBlockData;
      const modelData = findConnectedModel(nodeId, nodes, edges);
      const plotData = findConnectedPlots(nodeId, nodes, edges);

      if (!modelData) {
        useSimulationStore.getState().failRun(nodeId, 'No Model block connected.');
        return;
      }

      const req = buildSimulateRequest(nodeId, modelData, simData, plotData);

      let runId: string;
      try {
        runId = await postSimulate(req);
      } catch (err: any) {
        useSimulationStore.getState().failRun(nodeId, err?.message ?? 'Failed to start simulation.');
        return;
      }

      useSimulationStore.getState().setRunId(nodeId, runId);

      wsRef.current?.close();
      wsRef.current = new SimulationWebSocket(
        runId,
        (frame) => {
          if (frame.type === 'step') {
            useSimulationStore.getState().appendPoint(nodeId, { t: frame.t, values: frame.values });
          } else if (frame.type === 'complete') {
            useSimulationStore.getState().completeRun(nodeId, frame.elapsed_seconds);
          } else if (frame.type === 'error') {
            useSimulationStore.getState().failRun(nodeId, frame.message);
          }
        },
        () => {}
      );
      wsRef.current.connect();
    }

    start();
  }, [activeNodeId, nodeId]);

  // Clean up WS on unmount
  useEffect(() => {
    return () => { wsRef.current?.close(); };
  }, []);

  const run = useCallback(() => {
    useSimulationStore.getState().enqueue(nodeId);
  }, [nodeId]);

  const stop = useCallback(async () => {
    const store = useSimulationStore.getState();
    const runState = store.runs[nodeId];

    if (runState?.status === 'queued') {
      store.cancelQueued(nodeId);
      return;
    }

    wsRef.current?.close();
    if (runState?.runId) {
      try { await deleteSimulate(runState.runId); } catch {}
    }
    store.failRun(nodeId, 'Cancelled by user');
  }, [nodeId]);

  const runState = useSimulationStore((s) => s.runs[nodeId]);

  return { run, stop, runState };
}
