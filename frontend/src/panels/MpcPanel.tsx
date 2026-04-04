import { useState } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import type { MpcBlockData, ModelBlockData } from '../types/blocks';

interface Props {
  nodeId: string;
}

export function MpcPanel({ nodeId }: Props) {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const { getNode, updateNodeData } = useDiagramStore();
  const [showConstraints, setShowConstraints] = useState(false);

  const node = getNode(nodeId);
  if (!node || node.data.blockType !== 'mpc') return null;
  const data = node.data as MpcBlockData;

  // Find connected Model
  const modelEdge = edges.find(
    (e) => e.target === nodeId && e.targetHandle === 'mpc-model-in'
  );
  const modelNode = modelEdge ? nodes.find((n) => n.id === modelEdge.source) : undefined;
  const modelData = modelNode?.data.blockType === 'model'
    ? (modelNode.data as ModelBlockData)
    : null;

  const stateNames = modelData?.states.map((s) => s.name) ?? [];
  const inputNames = modelData?.inputs.map((i) => i.name) ?? [];

  function patch(partial: Partial<MpcBlockData>) {
    const next = { ...data, ...partial };
    const configured = next.dt > 0 && next.tEnd > 0 && next.horizon >= 1 && !!modelData;
    updateNodeData(nodeId, { ...partial, configured });
  }

  function applyNumeric(key: keyof MpcBlockData, raw: string) {
    const val = parseFloat(raw);
    if (Number.isFinite(val)) patch({ [key]: val } as any);
  }

  function applyInt(key: keyof MpcBlockData, raw: string) {
    const val = parseInt(raw, 10);
    if (Number.isFinite(val) && val >= 1) patch({ [key]: val } as any);
  }

  function applyRecord(
    key: 'initialConditions' | 'stateWeights' | 'inputWeights' | 'stateRef' | 'inputRef',
    varName: string,
    raw: string
  ) {
    const val = parseFloat(raw);
    if (Number.isFinite(val)) patch({ [key]: { ...data[key], [varName]: val } });
  }

  function applyBound(
    key: 'stateLb' | 'stateUb' | 'inputLb' | 'inputUb',
    varName: string,
    raw: string
  ) {
    const val = raw.trim() === '' ? null : parseFloat(raw);
    if (val === null || Number.isFinite(val))
      patch({ [key]: { ...data[key], [varName]: val } });
  }

  const inputClass =
    'w-full bg-stone-700 border border-stone-600 rounded px-2 py-1 text-white text-xs';
  const labelClass = 'block text-xs text-stone-400 mb-1';

  // key={nodeId} causes this div to remount when the selected node changes,
  // which resets all defaultValue inputs to the new node's stored values.
  return (
    <div key={nodeId} className="p-4 space-y-5 text-sm text-stone-200">
      {/* Label */}
      <div>
        <label className={labelClass}>Block label</label>
        <input
          className={inputClass}
          defaultValue={data.label}
          onBlur={(e) => patch({ label: e.target.value })}
        />
      </div>

      {!modelData && (
        <p className="text-xs text-stone-500 italic">
          Connect a Model block to configure cost and constraints.
        </p>
      )}

      {/* Time & horizon */}
      <section className="space-y-2">
        <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
          Time settings
        </span>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelClass}>Horizon N</label>
            <input
              type="number" step={1}
              className={inputClass}
              defaultValue={data.horizon}
              onBlur={(e) => applyInt('horizon', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>dt (s)</label>
            <input
              type="number" step="any"
              className={inputClass}
              defaultValue={data.dt}
              onBlur={(e) => applyNumeric('dt', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>T (s)</label>
            <input
              type="number" step="any"
              className={inputClass}
              defaultValue={data.tEnd}
              onBlur={(e) => applyNumeric('tEnd', e.target.value)}
            />
          </div>
        </div>
      </section>

      {modelData && stateNames.length > 0 && (
        <>
          {/* Initial conditions */}
          <section className="space-y-2">
            <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Initial conditions
            </span>
            {stateNames.map((name) => (
              <div key={name} className="flex items-center gap-2">
                <span className="font-mono text-xs text-stone-400 w-16 shrink-0 truncate" title={name}>
                  {name}(0)
                </span>
                <input
                  type="number" step="any"
                  className={inputClass}
                  defaultValue={data.initialConditions[name] ?? 0}
                  onBlur={(e) => applyRecord('initialConditions', name, e.target.value)}
                />
              </div>
            ))}
          </section>

          {/* Stage cost */}
          <section className="space-y-2">
            <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Stage cost (Q · R)
            </span>

            <div>
              <p className="text-xs text-stone-500 mb-1">States — weight Q, reference</p>
              {stateNames.map((name) => (
                <div key={name} className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-stone-400 w-12 shrink-0 truncate" title={name}>
                    {name}
                  </span>
                  <input
                    type="number" step="any"
                    className={inputClass}
                    placeholder="Q"
                    defaultValue={data.stateWeights[name] ?? 1}
                    onBlur={(e) => applyRecord('stateWeights', name, e.target.value)}
                  />
                  <input
                    type="number" step="any"
                    className={inputClass}
                    placeholder="ref"
                    defaultValue={data.stateRef[name] ?? 0}
                    onBlur={(e) => applyRecord('stateRef', name, e.target.value)}
                  />
                </div>
              ))}
            </div>

            {inputNames.length > 0 && (
              <div>
                <p className="text-xs text-stone-500 mb-1">Inputs — weight R, reference</p>
                {inputNames.map((name) => (
                  <div key={name} className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-stone-400 w-12 shrink-0 truncate" title={name}>
                      {name}
                    </span>
                    <input
                      type="number" step="any"
                      className={inputClass}
                      placeholder="R"
                      defaultValue={data.inputWeights[name] ?? 0.1}
                      onBlur={(e) => applyRecord('inputWeights', name, e.target.value)}
                    />
                    <input
                      type="number" step="any"
                      className={inputClass}
                      placeholder="ref"
                      defaultValue={data.inputRef[name] ?? 0}
                      onBlur={(e) => applyRecord('inputRef', name, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Constraints (collapsible) */}
          <section>
            <button
              className="flex items-center gap-1 text-xs font-semibold text-stone-400 hover:text-stone-200 uppercase tracking-wider"
              onClick={() => setShowConstraints((v) => !v)}
            >
              <span>{showConstraints ? '▾' : '▸'}</span>
              Box constraints
            </button>

            {showConstraints && (
              <div className="mt-2 space-y-3">
                <div>
                  <p className="text-xs text-stone-500 mb-1">States — lb, ub (leave blank for none)</p>
                  {stateNames.map((name) => (
                    <div key={name} className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-stone-400 w-12 shrink-0 truncate">{name}</span>
                      <input
                        type="number" step="any"
                        className={inputClass}
                        placeholder="lb"
                        defaultValue={data.stateLb[name] ?? ''}
                        onBlur={(e) => applyBound('stateLb', name, e.target.value)}
                      />
                      <input
                        type="number" step="any"
                        className={inputClass}
                        placeholder="ub"
                        defaultValue={data.stateUb[name] ?? ''}
                        onBlur={(e) => applyBound('stateUb', name, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                {inputNames.length > 0 && (
                  <div>
                    <p className="text-xs text-stone-500 mb-1">Inputs — lb, ub (leave blank for none)</p>
                    {inputNames.map((name) => (
                      <div key={name} className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-stone-400 w-12 shrink-0 truncate">{name}</span>
                        <input
                          type="number" step="any"
                          className={inputClass}
                          placeholder="lb"
                          defaultValue={data.inputLb[name] ?? ''}
                          onBlur={(e) => applyBound('inputLb', name, e.target.value)}
                        />
                        <input
                          type="number" step="any"
                          className={inputClass}
                          placeholder="ub"
                          defaultValue={data.inputUb[name] ?? ''}
                          onBlur={(e) => applyBound('inputUb', name, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
