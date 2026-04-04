import { useCallback, useEffect, useRef } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { useSimulationStore } from '../store/simulationStore';
import { buildMpcRequest, postMpc, deleteMpc } from '../api/simulation';
import { SimulationWebSocket } from '../api/websocket';
import type { ModelBlockData, PlantBlockData, MpcBlockData } from '../types/blocks';

function findConnectedModel(
  mpcNodeId: string,
  nodes: ReturnType<typeof useDiagramStore.getState>['nodes'],
  edges: ReturnType<typeof useDiagramStore.getState>['edges']
): ModelBlockData | null {
  const edge = edges.find(
    (e) => e.target === mpcNodeId && e.targetHandle === 'mpc-model-in'
  );
  if (!edge) return null;
  const node = nodes.find((n) => n.id === edge.source);
  if (!node || node.data.blockType !== 'model') return null;
  return node.data as ModelBlockData;
}

function findConnectedPlant(
  mpcNodeId: string,
  nodes: ReturnType<typeof useDiagramStore.getState>['nodes'],
  edges: ReturnType<typeof useDiagramStore.getState>['edges']
): PlantBlockData | null {
  const edge = edges.find(
    (e) => e.target === mpcNodeId && e.targetHandle === 'mpc-measurement-in'
  );
  if (!edge) return null;
  const node = nodes.find((n) => n.id === edge.source);
  if (!node || node.data.blockType !== 'plant') return null;
  return node.data as PlantBlockData;
}

export function useMpc(nodeId: string) {
  const wsRef = useRef<SimulationWebSocket | null>(null);
  const startedRef = useRef(false);
  const activeNodeId = useSimulationStore((s) => s.activeNodeId);

  useEffect(() => {
    if (activeNodeId !== nodeId) {
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    async function start() {
      const { nodes, edges } = useDiagramStore.getState();
      const mpcNode = nodes.find((n) => n.id === nodeId);
      if (!mpcNode || mpcNode.data.blockType !== 'mpc') {
        useSimulationStore.getState().failRun(nodeId, 'MPC block not found.');
        return;
      }

      const mpcData = mpcNode.data as MpcBlockData;
      const modelData = findConnectedModel(nodeId, nodes, edges);
      const plantData = findConnectedPlant(nodeId, nodes, edges);

      if (!modelData) {
        useSimulationStore.getState().failRun(nodeId, 'No Model block connected to MPC.');
        return;
      }
      if (!plantData) {
        useSimulationStore.getState().failRun(nodeId, 'No Plant block connected to MPC (measurement input).');
        return;
      }

      const req = buildMpcRequest(nodeId, modelData, plantData, mpcData);

      let runId: string;
      try {
        runId = await postMpc(req);
      } catch (err: any) {
        useSimulationStore.getState().failRun(nodeId, err?.message ?? 'Failed to start MPC.');
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
        () => {},
        'mpc'
      );
      wsRef.current.connect();
    }

    start();
  }, [activeNodeId, nodeId]);

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
      try { await deleteMpc(runState.runId); } catch {}
    }
    store.failRun(nodeId, 'Cancelled by user');
  }, [nodeId]);

  const runState = useSimulationStore((s) => s.runs[nodeId]);

  return { run, stop, runState };
}
