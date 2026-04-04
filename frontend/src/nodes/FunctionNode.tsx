import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useDiagramStore } from '../store/diagramStore';
import { useMlStore } from '../store/mlStore';
import { postEvaluate } from '../api/simulation';
import type { FunctionBlockData, DataBlockData } from '../types/blocks';

export function FunctionNode({ id, data: _data, selected }: NodeProps) {
  const data = _data as unknown as FunctionBlockData;
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const L = data.flipped ? Position.Right : Position.Left;
  const R = data.flipped ? Position.Left : Position.Right;

  function handleEvaluate(e: React.MouseEvent) {
    e.stopPropagation();
    if (status === 'running') return;
    const { nodes, edges } = useDiagramStore.getState();
    const dataEdge = edges.find((ed) => ed.target === id && ed.targetHandle === 'fn-input');
    const dataNode = dataEdge ? nodes.find((n) => n.id === dataEdge.source) : undefined;
    const dataBlock = dataNode?.data.blockType === 'data' ? (dataNode.data as DataBlockData) : null;
    if (!dataBlock?.csvContent) return;

    setStatus('running');
    postEvaluate({
      csv_content: dataBlock.csvContent,
      input_cols: dataBlock.inputCols,
      output_defs: data.outputs.map((o) => ({ name: o.name, expr: o.expr })),
    })
      .then((result) => {
        useMlStore.getState().setPredictions(id, result.series);
        setStatus('done');
      })
      .catch(() => setStatus('error'));
  }

  return (
    <div
      className={`rounded-lg border-2 min-w-[160px] shadow-lg overflow-hidden transition-all ${
        selected ? 'border-emerald-400' : data.configured ? 'border-emerald-600' : 'border-stone-600'
      }`}
    >
      <div className="bg-emerald-700 px-3 py-1.5 flex items-center gap-2">
        <span className="text-xs font-bold text-white uppercase tracking-wider">Function</span>
        {status === 'running' && (
          <span className="ml-auto text-xs text-emerald-200 animate-pulse">running…</span>
        )}
        {status === 'done' && <span className="ml-auto text-xs text-green-300">done</span>}
        {status === 'error' && <span className="ml-auto text-xs text-rose-300">error</span>}
        {data.configured && status === 'idle' && (
          <span className="ml-auto w-2 h-2 rounded-full bg-green-400" title="Configured" />
        )}
      </div>
      <div className="bg-stone-800 px-3 py-2 text-xs text-stone-300 space-y-1">
        <div className="font-semibold text-white truncate">{data.label}</div>
        <div className="text-stone-400">
          in:{' '}
          <span className="font-mono text-stone-300">
            {data.inputNames.join(', ') || '—'}
          </span>
        </div>
        <div className="text-stone-400">
          out:{' '}
          <span className="font-mono text-stone-300">
            {data.outputs.map((o) => o.name).join(', ') || '—'}
          </span>
        </div>
      </div>
      <div className="bg-stone-900 px-3 py-2">
        <button
          onClick={handleEvaluate}
          disabled={!data.configured || status === 'running'}
          className={`w-full py-1 rounded text-xs font-medium transition-colors border ${
            data.configured && status !== 'running'
              ? 'bg-emerald-800 hover:bg-emerald-700 text-emerald-200 border-emerald-700'
              : 'bg-stone-800 text-stone-500 cursor-not-allowed border-stone-700'
          }`}
          title={!data.configured ? 'Configure inputs/outputs first' : 'Evaluate on connected data'}
        >
          {status === 'running' ? 'Evaluating…' : 'Evaluate'}
        </button>
      </div>
      <Handle
        type="target"
        position={L}
        id="fn-input"
        className="!w-3 !h-3 !bg-sky-400 !border-2 !border-stone-800"
        title="Data input"
      />
      <Handle
        type="source"
        position={R}
        id="fn-output"
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-stone-800"
        title="Function output"
      />
    </div>
  );
}
