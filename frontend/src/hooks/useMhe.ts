import { useCallback, useEffect, useRef } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { useSimulationStore } from '../store/simulationStore';
import { buildMheRequest, postMhe, deleteMhe } from '../api/simulation';
import { SimulationWebSocket } from '../api/websocket';
import type { ModelBlockData, DataBlockData, MheBlockData } from '../types/blocks';

export function useMhe(nodeId: string) {
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
      const mheNode = nodes.find((n) => n.id === nodeId);
      if (!mheNode || mheNode.data.blockType !== 'mhe') {
        useSimulationStore.getState().failRun(nodeId, 'MHE block not found.');
        return;
      }
      const mheData = mheNode.data as MheBlockData;

      const modelEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'mhe-model-in');
      const modelNode = modelEdge ? nodes.find((n) => n.id === modelEdge.source) : undefined;
      const modelBlock = modelNode?.data.blockType === 'model' ? (modelNode.data as ModelBlockData) : null;

      if (!modelBlock?.configured) {
        useSimulationStore.getState().failRun(nodeId, 'No configured Model block connected to mhe-model-in.');
        return;
      }
      if (modelBlock.measurementExpressions.length === 0) {
        useSimulationStore.getState().failRun(
          nodeId,
          'The Model block has no measurement equations h(x). Add them in the Model config panel.'
        );
        return;
      }

      const dataEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'mhe-data-in');
      const dataNode = dataEdge ? nodes.find((n) => n.id === dataEdge.source) : undefined;
      const dataBlock = dataNode?.data.blockType === 'data' ? (dataNode.data as DataBlockData) : null;

      if (!dataBlock?.csvContent) {
        useSimulationStore.getState().failRun(nodeId, 'No Data block connected to mhe-data-in.');
        return;
      }
      if (dataBlock.outputCols.length === 0) {
        useSimulationStore.getState().failRun(
          nodeId,
          'Data block has no output (Y) columns assigned — these are used as measurements.'
        );
        return;
      }
      if (dataBlock.outputCols.length !== modelBlock.measurementExpressions.length) {
        useSimulationStore.getState().failRun(
          nodeId,
          `Data block has ${dataBlock.outputCols.length} Y column(s) but Model has ${modelBlock.measurementExpressions.length} measurement equation(s). They must match.`
        );
        return;
      }

      const req = buildMheRequest(nodeId, modelBlock, dataBlock, mheData);

      let runId: string;
      try {
        runId = await postMhe(req);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to start MHE.';
        useSimulationStore.getState().failRun(nodeId, msg);
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
        'mhe'
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
      try { await deleteMhe(runState.runId); } catch {}
    }
    store.failRun(nodeId, 'Cancelled by user');
  }, [nodeId]);

  return { run, stop };
}
