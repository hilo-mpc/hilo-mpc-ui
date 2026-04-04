import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { DataBlockData } from '../types/blocks';

export function DataNode({ data, selected }: NodeProps<DataBlockData>) {
  const Out = data.flipped ? Position.Left : Position.Right;

  return (
    <div
      className={`rounded-lg border-2 min-w-[160px] shadow-lg overflow-hidden transition-all ${
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
      <Handle
        type="source"
        position={Out}
        id="data-out"
        className="!w-3 !h-3 !bg-sky-400 !border-2 !border-stone-800"
        title="Data output"
      />
    </div>
  );
}
