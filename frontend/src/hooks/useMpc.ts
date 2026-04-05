import { useCallback, useEffect, useRef } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { useSimulationStore } from '../store/simulationStore';
import {
  buildMpcRequest, postMpc, deleteMpc,
  buildMheMpcRequest, postMheMpc, deleteMheMpc,
} from '../api/simulation';
import { SimulationWebSocket } from '../api/websocket';
import type { ModelBlockData, PlantBlockData, MpcBlockData, MheBlockData } from '../types/blocks';

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
  // Primary: plant-measurement-out → mpc-measurement-in (direct plant feedback)
  const measEdge = edges.find(
    (e) => e.target === mpcNodeId && e.targetHandle === 'mpc-measurement-in'
  );
  if (measEdge) {
    const node = nodes.find((n) => n.id === measEdge.source);
    if (node?.data.blockType === 'plant') return node.data as PlantBlockData;
  }

  // Fallback: mpc-control-out → plant-control-in (MHE is the measurement source,
  // but we still need the plant for closed-loop simulation)
  const controlEdge = edges.find(
    (e) => e.source === mpcNodeId && e.sourceHandle === 'mpc-control-out'
  );
  if (controlEdge) {
    const node = nodes.find((n) => n.id === controlEdge.target);
    if (node?.data.blockType === 'plant') return node.data as PlantBlockData;
  }

  return null;
}

/** Find an MHE block connected to mpc-measurement-in (if any). */
function findConnectedMhe(
  mpcNodeId: string,
  nodes: ReturnType<typeof useDiagramStore.getState>['nodes'],
  edges: ReturnType<typeof useDiagramStore.getState>['edges']
): { mheData: MheBlockData; mheModelData: ModelBlockData } | null {
  const measEdge = edges.find(
    (e) => e.target === mpcNodeId && e.targetHandle === 'mpc-measurement-in'
  );
  if (!measEdge) return null;

  const mheNode = nodes.find((n) => n.id === measEdge.source);
  if (!mheNode || mheNode.data.blockType !== 'mhe') return null;

  // Find the Model connected to the MHE block
  const mheModelEdge = edges.find(
    (e) => e.target === mheNode.id && e.targetHandle === 'mhe-model-in'
  );
  if (!mheModelEdge) return null;
  const mheModelNode = nodes.find((n) => n.id === mheModelEdge.source);
  if (!mheModelNode || mheModelNode.data.blockType !== 'model') return null;

  return {
    mheData: mheNode.data as MheBlockData,
    mheModelData: mheModelNode.data as ModelBlockData,
  };
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
      const mheInfo = findConnectedMhe(nodeId, nodes, edges);

      if (!modelData) {
        useSimulationStore.getState().failRun(nodeId, 'No Model block connected to MPC.');
        return;
      }
      if (!plantData) {
        useSimulationStore.getState().failRun(
          nodeId,
          'No Plant block found. Connect a Plant block to mpc-measurement-in (direct feedback) or to mpc-control-out (when MHE is in the loop).'
        );
        return;
      }

      // Decide which endpoint to call
      let runId: string;
      let wsType: 'mpc' | 'mhe-mpc';

      if (mheInfo) {
        // Online MHE-MPC: use the combined endpoint
        // Use the MHE's model for estimation (may differ from MPC prediction model)
        const req = buildMheMpcRequest(nodeId, mheInfo.mheModelData, plantData, mheInfo.mheData, mpcData);
        try {
          runId = await postMheMpc(req);
          wsType = 'mhe-mpc';
        } catch (err: any) {
          useSimulationStore.getState().failRun(nodeId, err?.message ?? 'Failed to start MHE-MPC.');
          return;
        }
      } else {
        // Standard MPC (direct plant feedback or no MHE)
        const req = buildMpcRequest(nodeId, modelData, plantData, mpcData);
        try {
          runId = await postMpc(req);
          wsType = 'mpc';
        } catch (err: any) {
          useSimulationStore.getState().failRun(nodeId, err?.message ?? 'Failed to start MPC.');
          return;
        }
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
        wsType,
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
      // Try both endpoints (only one will match)
      try { await deleteMpc(runState.runId); } catch {}
      try { await deleteMheMpc(runState.runId); } catch {}
    }
    store.failRun(nodeId, 'Cancelled by user');
  }, [nodeId]);

  const runState = useSimulationStore((s) => s.runs[nodeId]);

  return { run, stop, runState };
}
