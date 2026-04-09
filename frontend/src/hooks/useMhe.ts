import { useCallback, useEffect, useRef } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { useSimulationStore } from '../store/simulationStore';
import { buildMheRequest, buildMheWithPlantRequest, postMhe, deleteMhe } from '../api/simulation';
import { SimulationWebSocket } from '../api/websocket';
import type { ModelBlockData, DataBlockData, MheBlockData, PlantBlockData } from '../types/blocks';
import type { TimeSeriesPoint } from '../types/simulation';

/** Convert a run series to CSV. Columns that are missing from a row get empty string. */
function seriesToCsv(series: TimeSeriesPoint[], cols: string[]): string {
  const header = cols.join(',');
  const rows = series.map((pt) =>
    cols.map((c) => (pt.values[c] != null ? String(pt.values[c]) : '')).join(',')
  );
  return [header, ...rows].join('\n');
}

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

      // ── Find connected Model ───────────────────────────────────────────────
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
          'The Model has no measurement equations h(x). Add them in the Model config (▸ Measurement equations y = h(x)).'
        );
        return;
      }

      // ── Find data source: Data block or Plant block ────────────────────────
      const dataEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'mhe-data-in');
      const dataSourceNode = dataEdge ? nodes.find((n) => n.id === dataEdge.source) : undefined;

      let virtualData: { csvContent: string; inputCols: string[]; outputCols: string[] } | null = null;

      if (dataSourceNode?.data.blockType === 'data') {
        // ── Case 1: CSV Data block ─────────────────────────────────────────
        const dataBlock = dataSourceNode.data as DataBlockData;
        if (!dataBlock.csvContent) {
          useSimulationStore.getState().failRun(nodeId, 'Data block has no CSV loaded.');
          return;
        }
        if (dataBlock.outputCols.length === 0) {
          useSimulationStore.getState().failRun(
            nodeId,
            'Data block has no Y (output) columns assigned — these are used as measurements.'
          );
          return;
        }
        if (dataBlock.outputCols.length !== modelBlock.measurementExpressions.length) {
          useSimulationStore.getState().failRun(
            nodeId,
            `Data Y columns (${dataBlock.outputCols.length}) must match Model measurement equations (${modelBlock.measurementExpressions.length}).`
          );
          return;
        }
        virtualData = {
          csvContent: dataBlock.csvContent,
          inputCols: dataBlock.inputCols,
          outputCols: dataBlock.outputCols,
        };

      } else if (dataSourceNode?.data.blockType === 'plant') {
        const plantBlock = dataSourceNode.data as PlantBlockData;

        // Check if this Plant is part of an MPC loop (plant-measurement-out → mpc-measurement-in)
        const mpcMeasEdge = edges.find(
          (e) => e.source === dataSourceNode.id && e.sourceHandle === 'plant-measurement-out'
        );

        if (mpcMeasEdge) {
          // ── Case 2a: MPC-in-loop — use MPC run series as virtual CSV ──────
          const mpcNodeId = mpcMeasEdge.target;
          const runs = useSimulationStore.getState().runs;
          const plantSeries = runs[mpcNodeId]?.series ?? [];

          if (plantSeries.length === 0) {
            useSimulationStore.getState().failRun(
              nodeId,
              'No simulation data from the Plant yet. Run the MPC simulation first.'
            );
            return;
          }

          const measCols =
            plantBlock.measurementNames.length > 0
              ? plantBlock.measurementNames.map((m) => m.name).filter(Boolean)
              : plantBlock.states.map((s) => s.name);

          const inputCols = plantBlock.inputs.map((i) => i.name);

          if (measCols.length !== modelBlock.measurementExpressions.length) {
            useSimulationStore.getState().failRun(
              nodeId,
              `Plant has ${measCols.length} measurement(s) but Model has ${modelBlock.measurementExpressions.length} measurement equation(s). They must match.`
            );
            return;
          }

          const allCols = [...measCols, ...inputCols];
          virtualData = {
            csvContent: seriesToCsv(plantSeries, allCols),
            inputCols: inputCols,
            outputCols: measCols,
          };

        } else {
          // ── Case 2b: Standalone — simulate plant + estimate in backend ─────
          const req = buildMheWithPlantRequest(
            nodeId,
            modelBlock,
            plantBlock,
            mheData
          );

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
          return; // request already sent
        }

      } else {
        useSimulationStore.getState().failRun(
          nodeId,
          'No data source connected to mhe-data-in. Connect a Data block or Plant block.'
        );
        return;
      }

      // ── Build and send request ─────────────────────────────────────────────
      const req = buildMheRequest(nodeId, modelBlock, virtualData as DataBlockData, mheData);

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
