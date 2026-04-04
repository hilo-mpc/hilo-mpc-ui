import { useRef } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import type { DataBlockData } from '../types/blocks';

interface Props { nodeId: string; }

export function DataPanel({ nodeId }: Props) {
  const node = useDiagramStore((s) => s.nodes.find((n) => n.id === nodeId));
  const { updateNodeData } = useDiagramStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!node || node.data.blockType !== 'data') return null;
  const data = node.data as DataBlockData;

  function patch(partial: Partial<DataBlockData>) {
    const next = { ...data, ...partial };
    const configured = next.inputCols.length > 0 && next.outputCols.length > 0;
    updateNodeData(nodeId, { ...partial, configured });
  }

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
      patch({
        fileName: file.name,
        columns: header,
        rowCount: Math.max(0, lines.length - 1),
        csvContent: text,
        inputCols: [],
        outputCols: [],
      });
    };
    reader.readAsText(file);
    // Reset so same file can be re-loaded
    e.target.value = '';
  }

  function toggleInput(col: string) {
    const inputCols = data.inputCols.includes(col)
      ? data.inputCols.filter((c) => c !== col)
      : [...data.inputCols.filter((c) => c !== col), col];
    const outputCols = data.outputCols.filter((c) => c !== col);
    patch({ inputCols, outputCols });
  }

  function toggleOutput(col: string) {
    const outputCols = data.outputCols.includes(col)
      ? data.outputCols.filter((c) => c !== col)
      : [...data.outputCols.filter((c) => c !== col), col];
    const inputCols = data.inputCols.filter((c) => c !== col);
    patch({ inputCols, outputCols });
  }

  return (
    <div className="p-4 space-y-5 text-sm text-stone-200">
      {/* Label */}
      <div>
        <label className="block text-xs text-stone-400 mb-1">Block label</label>
        <input
          className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1 text-sm text-white"
          value={data.label}
          onChange={(e) => updateNodeData(nodeId, { label: e.target.value })}
        />
      </div>

      {/* File upload */}
      <section>
        <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">CSV File</span>
        <div className="mt-2 space-y-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 rounded text-xs font-medium bg-sky-800 hover:bg-sky-700 text-sky-200 transition-colors border border-sky-700"
          >
            {data.fileName ? 'Replace CSV…' : 'Upload CSV…'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFile}
          />
          {data.fileName && (
            <div className="text-xs text-stone-400">
              <span className="text-white font-medium">{data.fileName}</span>
              {' '}— {data.rowCount} rows, {data.columns.length} columns
            </div>
          )}
        </div>
      </section>

      {/* Column assignment */}
      {data.columns.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">Columns</span>
            <span className="text-xs text-stone-500">X = input &nbsp; Y = output</span>
          </div>
          <div className="space-y-1">
            {data.columns.map((col) => {
              const isIn = data.inputCols.includes(col);
              const isOut = data.outputCols.includes(col);
              return (
                <div key={col} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate text-stone-300 font-mono" title={col}>{col}</span>
                  <button
                    onClick={() => toggleInput(col)}
                    className={`px-2 py-0.5 rounded border text-xs transition-colors ${
                      isIn
                        ? 'bg-sky-700 border-sky-500 text-white'
                        : 'bg-stone-700 border-stone-600 text-stone-400 hover:border-sky-600'
                    }`}
                  >
                    X
                  </button>
                  <button
                    onClick={() => toggleOutput(col)}
                    className={`px-2 py-0.5 rounded border text-xs transition-colors ${
                      isOut
                        ? 'bg-indigo-700 border-indigo-500 text-white'
                        : 'bg-stone-700 border-stone-600 text-stone-400 hover:border-indigo-600'
                    }`}
                  >
                    Y
                  </button>
                </div>
              );
            })}
          </div>
          {(data.inputCols.length > 0 || data.outputCols.length > 0) && (
            <div className="mt-3 text-xs text-stone-400">
              {data.inputCols.length} input{data.inputCols.length !== 1 ? 's' : ''} (X) &nbsp;→&nbsp;{' '}
              {data.outputCols.length} output{data.outputCols.length !== 1 ? 's' : ''} (Y)
            </div>
          )}
          {data.inputCols.length === 0 && (
            <p className="mt-2 text-xs text-stone-500 italic">Select at least one X column</p>
          )}
          {data.outputCols.length === 0 && (
            <p className="mt-1 text-xs text-stone-500 italic">Select at least one Y column</p>
          )}
        </section>
      )}
    </div>
  );
}
