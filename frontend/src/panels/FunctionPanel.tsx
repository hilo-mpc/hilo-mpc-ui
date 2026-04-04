import { useDiagramStore } from '../store/diagramStore';
import type { FunctionBlockData, FunctionOutput } from '../types/blocks';

interface Props {
  nodeId: string;
}

export function FunctionPanel({ nodeId }: Props) {
  const node = useDiagramStore((s) => s.nodes.find((n) => n.id === nodeId));
  const { updateNodeData } = useDiagramStore();
  if (!node || node.data.blockType !== 'function') return null;
  const data = node.data as FunctionBlockData;

  function patch(partial: Partial<FunctionBlockData>) {
    const next = { ...data, ...partial };
    const configured =
      next.inputNames.length > 0 &&
      next.outputs.length > 0 &&
      next.outputs.every((o) => o.name.trim() && o.expr.trim());
    updateNodeData(nodeId, { ...partial, configured });
  }

  function setInputNames(value: string) {
    patch({ inputNames: value.split(',').map((s) => s.trim()).filter(Boolean) });
  }

  function setOutput(i: number, partial: Partial<FunctionOutput>) {
    const outputs = data.outputs.map((o, j) => (j === i ? { ...o, ...partial } : o));
    patch({ outputs });
  }

  function addOutput() {
    patch({ outputs: [...data.outputs, { name: `y${data.outputs.length + 1}`, expr: '' }] });
  }

  function removeOutput(i: number) {
    patch({ outputs: data.outputs.filter((_, j) => j !== i) });
  }

  return (
    <div className="p-4 space-y-5 text-sm text-stone-200">
      {/* Label */}
      <div>
        <label className="block text-xs text-stone-400 mb-1">Block label</label>
        <input
          className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1 text-white"
          value={data.label}
          onChange={(e) => updateNodeData(nodeId, { label: e.target.value })}
        />
      </div>

      {/* Input names */}
      <div>
        <label className="block text-xs text-stone-400 mb-1">Input names (comma-separated)</label>
        <input
          className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1 text-white font-mono text-xs"
          value={data.inputNames.join(', ')}
          onChange={(e) => setInputNames(e.target.value)}
          placeholder="e.g. x, t"
        />
        <p className="text-xs text-stone-500 mt-1">Must match column names in the connected Data block</p>
      </div>

      {/* Outputs */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">Outputs</span>
          <button className="text-xs text-emerald-400 hover:text-emerald-300" onClick={addOutput}>
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {data.outputs.map((out, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                className="w-16 shrink-0 bg-stone-700 border border-stone-600 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                value={out.name}
                placeholder="name"
                onChange={(e) => setOutput(i, { name: e.target.value })}
              />
              <span className="text-stone-500 text-xs shrink-0">=</span>
              <input
                className="flex-1 min-w-0 bg-stone-700 border border-stone-600 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                value={out.expr}
                placeholder="e.g. sin(x)"
                onChange={(e) => setOutput(i, { expr: e.target.value })}
              />
              <button
                className="shrink-0 text-stone-500 hover:text-rose-400 text-sm leading-none"
                onClick={() => removeOutput(i)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {data.outputs.length === 0 && (
          <p className="text-xs text-stone-500 italic mt-1">No outputs — click "+ Add"</p>
        )}
      </section>

      {/* Available math */}
      <section>
        <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
          Available functions
        </span>
        <p className="mt-1 text-xs text-stone-500 font-mono leading-relaxed">
          sin cos tan asin acos atan atan2 sinh cosh tanh exp log sqrt abs pi e
        </p>
      </section>
    </div>
  );
}
