import { useCallback, useEffect, useRef } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { useSimulationStore } from '../store/simulationStore';
import { buildTrainRequest, postTrain, deleteTrain } from '../api/simulation';
import { SimulationWebSocket } from '../api/websocket';
import type { DataBlockData, AnnBlockData } from '../types/blocks';

export function useAnn(nodeId: string) {
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
      const annNode = nodes.find((n) => n.id === nodeId);
      if (!annNode || annNode.data.blockType !== 'ann') {
        useSimulationStore.getState().failRun(nodeId, 'ANN block not found.');
        return;
      }

      const annData = annNode.data as AnnBlockData;
      const dataEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'ann-data-in');
      const dataNode = dataEdge ? nodes.find((n) => n.id === dataEdge.source) : undefined;
      const dataBlock = dataNode?.data.blockType === 'data' ? (dataNode.data as DataBlockData) : null;

      if (!dataBlock) {
        useSimulationStore.getState().failRun(nodeId, 'No Data block connected.');
        return;
      }
      if (!dataBlock.configured) {
        useSimulationStore.getState().failRun(nodeId, 'Data block not configured (select X/Y columns).');
        return;
      }

      const req = buildTrainRequest(nodeId, dataBlock, annData);

      let runId: string;
      try {
        runId = await postTrain(req);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to start training.';
        useSimulationStore.getState().failRun(nodeId, msg);
        return;
      }

      useSimulationStore.getState().setRunId(nodeId, runId);
      wsRef.current?.close();
      wsRef.current = new SimulationWebSocket(
        runId,
        (frame) => {
          if (frame.type === 'epoch') {
            const values: Record<string, number> = { train_loss: frame.train_loss };
            if (frame.val_loss != null) values.val_loss = frame.val_loss;
            useSimulationStore.getState().appendPoint(nodeId, { t: frame.epoch, values });
          } else if (frame.type === 'complete') {
            useSimulationStore.getState().completeRun(nodeId, frame.elapsed_seconds);
          } else if (frame.type === 'error') {
            useSimulationStore.getState().failRun(nodeId, frame.message);
          }
        },
        () => {},
        'train'
      );
      wsRef.current.connect();
    }

    start();
  }, [activeNodeId, nodeId]);

  useEffect(() => {
    return () => { wsRef.current?.close(); };
  }, []);

  const train = useCallback(() => {
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
      try { await deleteTrain(runState.runId); } catch {}
    }
    store.failRun(nodeId, 'Cancelled by user');
  }, [nodeId]);

  return { train, stop };
}
