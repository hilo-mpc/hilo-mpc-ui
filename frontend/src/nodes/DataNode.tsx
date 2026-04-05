import { useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useDiagramStore } from '../store/diagramStore';
import type { DataBlockData } from '../types/blocks';
import { HandleTag } from './HandleTag';

export function DataNode({ id, data, selected }: NodeProps<DataBlockData>) {
  const { updateNodeData } = useDiagramStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const Out = data.flipped ? Position.Left : Position.Right;
  const sideOut = data.flipped ? 'left' : 'right';

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? '';
      const lines = text.split('\n').filter((l) => l.trim());
      const header = lines[0]
        ? lines[0].split(',').map((s) => s.trim().replace(/^"|"$/g, ''))
        : [];
      updateNodeData(id, {
        fileName: file.name,
        columns: header,
        rowCount: Math.max(0, lines.length - 1),
        csvContent: text,
        inputCols: [],
        outputCols: [],
        configured: false,
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="relative min-w-[160px]">
      <div
        className={`rounded-lg border-2 shadow-lg overflow-hidden transition-all ${
          selected ? 'border-sky-400' : data.configured ? 'border-sky-600' : 'border-stone-600'
        }`}
      >
        <div className="bg-sky-700 px-3 py-1.5 flex items-center gap-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Data</span>
          {data.configured && (
            <span className="ml-auto w-2 h-2 rounded-full bg-green-400" title="Configured" />
          )}
        </div>
        <div className="bg-stone-800 px-3 py-2 text-xs text-stone-300 space-y-1">
          <div className="font-semibold text-white truncate">{data.label}</div>
          {data.fileName ? (
            <>
              <div className="text-stone-400 truncate" title={data.fileName}>{data.fileName}</div>
              <div className="text-stone-400">
                {data.rowCount} rows &nbsp;|&nbsp; {data.inputCols.length}x → {data.outputCols.length}y
              </div>
            </>
          ) : (
            <div className="text-stone-500 italic">No CSV loaded</div>
          )}
        </div>
        <div className="bg-stone-900 px-3 py-2">
          <button
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            className="w-full py-1 rounded text-xs font-medium bg-sky-800 hover:bg-sky-700 text-sky-200 transition-colors border border-sky-700"
          >
            {data.fileName ? 'Replace CSV' : 'Upload CSV'}
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv"
            className="hidden" onChange={handleFile} />
        </div>
      </div>

      <Handle type="source" position={Out} id="data-out"
        className="!w-3 !h-3 !bg-sky-400 !border-2 !border-stone-800" />
      <HandleTag nodeId={id} handleId="data-out" label="ANN · Fn · MHE" side={sideOut} />
    </div>
  );
}
