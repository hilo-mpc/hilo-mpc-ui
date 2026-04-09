import { useDiagramStore } from '../store/diagramStore';
import type { MheBlockData, ModelBlockData, DataBlockData, PlantBlockData } from '../types/blocks';

interface Props {
  nodeId: string;
}

function NoiseRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-stone-400 font-mono text-xs w-24 truncate shrink-0">{label}</span>
      <input
        type="number"
        step="any"
        min={0}
        className="flex-1 bg-stone-700 border border-stone-600 rounded px-1.5 py-0.5 text-xs text-white font-mono"
        defaultValue={value}
        onBlur={(e) => {
          const v = parseFloat(e.target.value);
          if (v >= 0) onChange(v);
        }}
      />
    </div>
  );
}

export function MhePanel({ nodeId }: Props) {
  const node = useDiagramStore((s) => s.nodes.find((n) => n.id === nodeId));
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const { updateNodeData } = useDiagramStore();

  if (!node || node.data.blockType !== 'mhe') return null;
  const data = node.data as MheBlockData;

  // Find connected Model
  const modelEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'mhe-model-in');
  const modelNode = modelEdge ? nodes.find((n) => n.id === modelEdge.source) : undefined;
  const modelData = modelNode?.data.blockType === 'model' ? (modelNode.data as ModelBlockData) : null;

  // Find connected data source (Data block or Plant block)
  const dataEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'mhe-data-in');
  const dataSourceNode = dataEdge ? nodes.find((n) => n.id === dataEdge.source) : undefined;
  const dataBlock = dataSourceNode?.data.blockType === 'data' ? (dataSourceNode.data as DataBlockData) : null;
  const plantBlock = dataSourceNode?.data.blockType === 'plant' ? (dataSourceNode.data as PlantBlockData) : null;

  const stateNames = modelData?.states.map((s) => s.name) ?? [];
  const measNames = modelData?.measurementNames.map((m) => m.name) ?? [];

  function patch(partial: Partial<MheBlockData>) {
    const next = { ...data, ...partial };
    const configured = next.horizon > 0 && next.dt > 0 && (next.tEnd ?? 10) > 0;
    updateNodeData(nodeId, { ...partial, configured });
  }

  function setNoise(
    field: 'processNoise' | 'measurementNoise' | 'arrivalCost' | 'initialGuess',
    key: string,
    value: number
  ) {
    patch({ [field]: { ...data[field], [key]: value } });
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

      {/* Connected model info */}
      {!modelData ? (
        <p className="text-xs text-stone-500 italic">
          Connect a Model block (with measurement equations) to mhe-model-in
        </p>
      ) : measNames.length === 0 ? (
        <div className="rounded bg-amber-900/30 border border-amber-700 px-3 py-2 text-xs text-amber-300">
          The connected Model has no measurement equations h(x). Open the Model config and expand
          "▸ Measurement equations y = h(x)" to add them.
        </div>
      ) : (
        <div className="rounded bg-stone-800 border border-stone-700 px-3 py-2 text-xs text-stone-400 space-y-0.5">
          <div>Model: <span className="text-white">{modelData.label}</span></div>
          <div>States: <span className="text-white font-mono">{stateNames.join(', ')}</span></div>
          <div>Measurements: <span className="text-white font-mono">{measNames.join(', ')}</span></div>
        </div>
      )}

      {/* Connected data source info */}
      {dataBlock && (
        <div className="rounded bg-stone-800 border border-stone-700 px-3 py-2 text-xs text-stone-400 space-y-0.5">
          <div>Data: <span className="text-white">{dataBlock.label}</span>
            {' '}<span className="text-stone-500">({dataBlock.rowCount} rows)</span>
          </div>
          <div>Y cols: <span className="text-white font-mono">{dataBlock.outputCols.join(', ') || '—'}</span></div>
          {dataBlock.inputCols.length > 0 && (
            <div>U cols: <span className="text-white font-mono">{dataBlock.inputCols.join(', ')}</span></div>
          )}
        </div>
      )}
      {plantBlock && (
        <div className="rounded bg-stone-800 border border-teal-700 px-3 py-2 text-xs text-stone-400 space-y-0.5">
          <div>Plant: <span className="text-white">{plantBlock.label}</span>
            <span className="text-stone-500"> (standalone simulation)</span>
          </div>
          <div>
            Measurements:{' '}
            <span className="text-white font-mono">
              {plantBlock.measurementNames.length > 0
                ? plantBlock.measurementNames.map((m) => m.name).join(', ')
                : plantBlock.states.map((s) => s.name).join(', ') + ' (full state)'}
            </span>
          </div>
          {plantBlock.inputs.length > 0 && (
            <div>Inputs: <span className="text-white font-mono">{plantBlock.inputs.map((i) => i.name).join(', ')}</span></div>
          )}
        </div>
      )}
      {!dataBlock && !plantBlock && (
        <p className="text-xs text-stone-500 italic">
          Connect a Data block or Plant block to mhe-data-in
        </p>
      )}

      {/* Horizon, dt, T end */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-stone-400 mb-1">Horizon N</label>
          <input
            type="number"
            min={1}
            className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1 text-white"
            defaultValue={data.horizon}
            onBlur={(e) => {
              const v = parseInt(e.target.value);
              if (v > 0) patch({ horizon: v });
            }}
          />
        </div>
        <div>
          <label className="block text-xs text-stone-400 mb-1">dt (s)</label>
          <input
            type="number"
            step="any"
            min={0}
            className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1 text-white"
            defaultValue={data.dt}
            onBlur={(e) => {
              const v = parseFloat(e.target.value);
              if (v > 0) patch({ dt: v });
            }}
          />
        </div>
        <div>
          <label className="block text-xs text-stone-400 mb-1">T end (s)</label>
          <input
            type="number"
            step="any"
            min={0}
            className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1 text-white"
            defaultValue={data.tEnd ?? 10}
            onBlur={(e) => {
              const v = parseFloat(e.target.value);
              if (v > 0) patch({ tEnd: v });
            }}
          />
        </div>
      </div>

      {/* Process noise Q */}
      {stateNames.length > 0 && (
        <section className="space-y-2">
          <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
            Process noise Q
          </span>
          <div className="space-y-1.5 mt-1">
            {stateNames.map((name) => (
              <NoiseRow
                key={name}
                label={name}
                value={data.processNoise[name] ?? 0.1}
                onChange={(v) => setNoise('processNoise', name, v)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Measurement noise R */}
      {measNames.length > 0 && (
        <section className="space-y-2">
          <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
            Measurement noise R
          </span>
          <div className="space-y-1.5 mt-1">
            {measNames.map((name) => (
              <NoiseRow
                key={name}
                label={name}
                value={data.measurementNoise[name] ?? 1.0}
                onChange={(v) => setNoise('measurementNoise', name, v)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Arrival cost P0 & initial guess */}
      {stateNames.length > 0 && (
        <section className="space-y-2">
          <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
            Arrival cost P₀ / initial guess
          </span>
          <div className="space-y-1.5 mt-1">
            {stateNames.map((name) => (
              <div key={name} className="flex items-center gap-2">
                <span className="text-stone-400 font-mono text-xs w-24 truncate shrink-0">{name}</span>
                <input
                  type="number"
                  step="any"
                  min={0}
                  className="flex-1 bg-stone-700 border border-stone-600 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                  placeholder="P₀"
                  defaultValue={data.arrivalCost[name] ?? 1.0}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value);
                    if (v >= 0) setNoise('arrivalCost', name, v);
                  }}
                />
                <input
                  type="number"
                  step="any"
                  className="flex-1 bg-stone-700 border border-stone-600 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                  placeholder="x₀"
                  defaultValue={data.initialGuess[name] ?? 0.0}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) setNoise('initialGuess', name, v);
                  }}
                />
              </div>
            ))}
            <div className="flex gap-2 text-xs text-stone-500">
              <span className="w-24 shrink-0" />
              <span className="flex-1 text-center">P₀ weight</span>
              <span className="flex-1 text-center">x₀ guess</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
