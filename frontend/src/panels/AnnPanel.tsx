import { useDiagramStore } from '../store/diagramStore';
import { useSimulationStore } from '../store/simulationStore';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import type { AnnBlockData, AnnLayer, DataBlockData } from '../types/blocks';

interface Props { nodeId: string; }

const ACTIVATIONS = ['relu', 'tanh', 'sigmoid', 'linear'] as const;

export function AnnPanel({ nodeId }: Props) {
  const node = useDiagramStore((s) => s.nodes.find((n) => n.id === nodeId));
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const { updateNodeData } = useDiagramStore();
  const series = useSimulationStore((s) => s.runs[nodeId]?.series ?? []);

  if (!node || node.data.blockType !== 'ann') return null;
  const data = node.data as AnnBlockData;

  // Find connected data block
  const dataEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'ann-data-in');
  const dataNode = dataEdge ? nodes.find((n) => n.id === dataEdge.source) : undefined;
  const dataBlock = dataNode?.data.blockType === 'data' ? (dataNode.data as DataBlockData) : null;

  function patch(partial: Partial<AnnBlockData>) {
    const next = { ...data, ...partial };
    const configured = next.layers.length > 0 && !!dataBlock?.configured;
    updateNodeData(nodeId, { ...partial, configured });
  }

  function setLayer(i: number, layer: Partial<AnnLayer>) {
    const layers = data.layers.map((l, j) => (j === i ? { ...l, ...layer } : l));
    patch({ layers });
  }

  function addLayer() {
    patch({ layers: [...data.layers, { units: 32, activation: 'relu' }] });
  }

  function removeLayer(i: number) {
    patch({ layers: data.layers.filter((_, j) => j !== i) });
  }

  return (
    <div key={nodeId} className="p-4 space-y-5 text-sm text-stone-200">
      {/* Label */}
      <div>
        <label className="block text-xs text-stone-400 mb-1">Block label</label>
        <input
          className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1 text-sm text-white"
          value={data.label}
          onChange={(e) => updateNodeData(nodeId, { label: e.target.value })}
        />
      </div>

      {/* Data source info */}
      <div className="text-xs rounded bg-stone-800 border border-stone-700 px-3 py-2">
        {dataBlock?.configured ? (
          <span className="text-stone-300">
            Input: <span className="text-white font-mono">{dataBlock.inputCols.join(', ')}</span>
            <br />Output: <span className="text-white font-mono">{dataBlock.outputCols.join(', ')}</span>
          </span>
        ) : (
          <span className="text-stone-500 italic">
            {dataBlock ? 'Data block not configured (select X/Y columns)' : 'Connect a Data block to ann-data-in'}
          </span>
        )}
      </div>

      {/* Layers */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">Layers</span>
          <button className="text-xs text-indigo-400 hover:text-indigo-300" onClick={addLayer}>+ Add</button>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-stone-500">
              <th className="text-left pb-1 w-16">Units</th>
              <th className="text-left pb-1">Activation</th>
              <th className="pb-1 w-6" />
            </tr>
          </thead>
          <tbody>
            {data.layers.map((layer, i) => (
              <tr key={i} className="group">
                <td className="pr-1 pb-1">
                  <input
                    type="number"
                    min={1}
                    className="w-full bg-stone-700 border border-stone-600 rounded px-1.5 py-0.5 text-white font-mono"
                    defaultValue={layer.units}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value);
                      if (v > 0) setLayer(i, { units: v });
                    }}
                  />
                </td>
                <td className="pr-1 pb-1">
                  <select
                    className="w-full bg-stone-700 border border-stone-600 rounded px-1.5 py-0.5 text-white"
                    value={layer.activation}
                    onChange={(e) => setLayer(i, { activation: e.target.value as AnnLayer['activation'] })}
                  >
                    {ACTIVATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </td>
                <td className="pb-1 text-center">
                  <button
                    className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-rose-400"
                    onClick={() => removeLayer(i)}
                  >×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.layers.length === 0 && (
          <p className="text-stone-500 italic text-xs">No layers — click "+ Add"</p>
        )}
      </section>

      {/* Training params */}
      <section className="space-y-3">
        <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">Training</span>
        <div className="grid grid-cols-2 gap-2 text-xs mt-2">
          <div>
            <label className="text-stone-400 block mb-1">Epochs</label>
            <input type="number" min={1} className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1 text-white"
              defaultValue={data.epochs}
              onBlur={(e) => { const v = parseInt(e.target.value); if (v > 0) patch({ epochs: v }); }} />
          </div>
          <div>
            <label className="text-stone-400 block mb-1">Batch size</label>
            <input type="number" min={1} className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1 text-white"
              defaultValue={data.batchSize}
              onBlur={(e) => { const v = parseInt(e.target.value); if (v > 0) patch({ batchSize: v }); }} />
          </div>
          <div>
            <label className="text-stone-400 block mb-1">Learning rate</label>
            <input type="number" step="any" min={0} className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1 text-white font-mono"
              defaultValue={data.learningRate}
              onBlur={(e) => { const v = parseFloat(e.target.value); if (v > 0) patch({ learningRate: v }); }} />
          </div>
          <div>
            <label className="text-stone-400 block mb-1">Train split</label>
            <input type="number" min={0.1} max={0.99} step={0.05} className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1 text-white"
              defaultValue={data.trainSplit}
              onBlur={(e) => { const v = parseFloat(e.target.value); if (v > 0 && v < 1) patch({ trainSplit: v }); }} />
          </div>
        </div>
      </section>

      {/* Live loss chart */}
      {series.length > 1 && (
        <section>
          <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">Loss</span>
          <div className="mt-2">
            <TimeSeriesChart
              series={series}
              yAxes={series[0]?.values.val_loss != null ? ['train_loss', 'val_loss'] : ['train_loss']}
              height={160}
            />
          </div>
        </section>
      )}

      {/* Trained model info */}
      {data.trainedModel && (
        <section className="rounded bg-stone-800 border border-stone-700 px-3 py-2 space-y-1">
          <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
            Trained model
          </span>
          <div className="text-xs text-stone-400 mt-1">
            in: <span className="text-white font-mono">{data.trainedModel.inputCols.join(', ')}</span>
          </div>
          <div className="text-xs text-stone-400">
            out: <span className="text-white font-mono">{data.trainedModel.outputCols.join(', ')}</span>
          </div>
          <p className="text-xs text-stone-500 italic mt-1">
            Connect a Data block to fn-input, then click Predict on the node.
          </p>
        </section>
      )}
    </div>
  );
}
