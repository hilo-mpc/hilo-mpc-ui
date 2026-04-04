import { useState } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import type { PlantBlockData, Variable, Parameter } from '../types/blocks';

interface Props {
  nodeId: string;
}

function newVar(): Variable { return { name: '' }; }
function newParam(): Parameter { return { name: '', value: 0 }; }

export function PlantPanel({ nodeId }: Props) {
  const node = useDiagramStore((s) => s.nodes.find((n) => n.id === nodeId));
  const { updateNodeData } = useDiagramStore();
  const [showMeasurements, setShowMeasurements] = useState(false);

  if (!node || node.data.blockType !== 'plant') return null;
  const data = node.data as PlantBlockData;

  function patch(partial: Partial<PlantBlockData>) {
    const next = { ...data, ...partial };
    const configured =
      next.states.length > 0 &&
      next.states.every((s) => s.name.trim() !== '') &&
      next.odeExpressions.length === next.states.length &&
      next.odeExpressions.every((e) => e.trim() !== '');
    updateNodeData(nodeId, { ...partial, configured });
  }

  function setStates(states: Variable[]) {
    const exprs = states.map((_, i) => data.odeExpressions[i] ?? '');
    patch({ states, odeExpressions: exprs });
  }

  function setOde(index: number, expr: string) {
    const exprs = data.odeExpressions.map((e, i) => (i === index ? expr : e));
    patch({ odeExpressions: exprs });
  }

  function setInputs(inputs: Variable[]) {
    patch({ inputs });
  }

  function setParameters(parameters: Parameter[]) {
    patch({ parameters });
  }

  function setMeasurementName(index: number, name: string) {
    const measurementNames = data.measurementNames.map((m, i) =>
      i === index ? { ...m, name } : m
    );
    patch({ measurementNames });
  }

  function setMeasurementExpr(index: number, expr: string) {
    const measurementExpressions = data.measurementExpressions.map((e, i) =>
      i === index ? expr : e
    );
    patch({ measurementExpressions });
  }

  function addMeasurement() {
    patch({
      measurementNames: [...data.measurementNames, { name: '' }],
      measurementExpressions: [...data.measurementExpressions, ''],
    });
  }

  function removeMeasurement(index: number) {
    patch({
      measurementNames: data.measurementNames.filter((_, i) => i !== index),
      measurementExpressions: data.measurementExpressions.filter((_, i) => i !== index),
    });
  }

  const inputCls = 'w-full bg-stone-700 border border-stone-600 rounded px-1.5 py-0.5 text-white text-xs';

  return (
    <div className="p-4 space-y-5 text-sm text-stone-200">
      {/* Label */}
      <div>
        <label className="block text-xs text-stone-400 mb-1">Block label</label>
        <input
          className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1 text-sm text-white"
          value={data.label}
          onChange={(e) => patch({ label: e.target.value })}
        />
      </div>

      {/* Parameters */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">Parameters (p)</span>
          <button className="text-xs text-teal-400 hover:text-teal-300" onClick={() => setParameters([...data.parameters, newParam()])}>
            + Add
          </button>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-stone-500">
              <th className="text-left pb-1 w-1/2">Name</th>
              <th className="text-left pb-1">Value</th>
              <th className="pb-1 w-6" />
            </tr>
          </thead>
          <tbody>
            {data.parameters.map((p, i) => (
              <tr key={i} className="group">
                <td className="pr-1 pb-1">
                  <input className={inputCls} placeholder="k" value={p.name}
                    onChange={(e) => setParameters(data.parameters.map((par, j) => j === i ? { ...par, name: e.target.value } : par))} />
                </td>
                <td className="pr-1 pb-1">
                  <input type="number" className={inputCls} placeholder="0" value={p.value}
                    onChange={(e) => setParameters(data.parameters.map((par, j) => j === i ? { ...par, value: parseFloat(e.target.value) || 0 } : par))} />
                </td>
                <td className="pb-1 text-center">
                  <button className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-rose-400"
                    onClick={() => setParameters(data.parameters.filter((_, j) => j !== i))}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.parameters.length === 0 && <p className="text-stone-500 italic text-xs">No parameters</p>}
      </section>

      {/* Inputs */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">Inputs (u)</span>
          <button className="text-xs text-teal-400 hover:text-teal-300" onClick={() => setInputs([...data.inputs, newVar()])}>+ Add</button>
        </div>
        <div className="flex flex-wrap gap-1">
          {data.inputs.map((inp, i) => (
            <div key={i} className="flex items-center gap-1 bg-stone-700 rounded px-2 py-0.5">
              <input className="bg-transparent text-white w-16 text-xs focus:outline-none" placeholder="u" value={inp.name}
                onChange={(e) => setInputs(data.inputs.map((v, j) => j === i ? { ...v, name: e.target.value } : v))} />
              <button className="text-stone-500 hover:text-rose-400 text-xs" onClick={() => setInputs(data.inputs.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          {data.inputs.length === 0 && <span className="text-stone-500 italic text-xs">No inputs</span>}
        </div>
      </section>

      {/* States + ODE */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">States (x)</span>
          <button className="text-xs text-teal-400 hover:text-teal-300" onClick={() => setStates([...data.states, newVar()])}>+ Add</button>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-stone-500">
              <th className="text-left pb-1 w-1/3">Name</th>
              <th className="text-left pb-1">ẋ = f(x, u, p)</th>
              <th className="pb-1 w-6" />
            </tr>
          </thead>
          <tbody>
            {data.states.map((s, i) => (
              <tr key={i} className="group">
                <td className="pr-1 pb-1">
                  <input className={inputCls} placeholder="x" value={s.name}
                    onChange={(e) => setStates(data.states.map((st, j) => j === i ? { ...st, name: e.target.value } : st))} />
                </td>
                <td className="pr-1 pb-1">
                  <input className={`${inputCls} font-mono`} placeholder="v" value={data.odeExpressions[i] ?? ''}
                    onChange={(e) => setOde(i, e.target.value)} />
                </td>
                <td className="pb-1 text-center">
                  <button className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-rose-400"
                    onClick={() => setStates(data.states.filter((_, j) => j !== i))}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.states.length === 0 && <p className="text-stone-500 italic text-xs">No states — click "+ Add"</p>}
      </section>

      {/* Measurement equations (collapsible) */}
      <section>
        <button
          className="flex items-center gap-1 text-xs font-semibold text-stone-400 hover:text-stone-200 uppercase tracking-wider"
          onClick={() => setShowMeasurements((v) => !v)}
        >
          <span>{showMeasurements ? '▾' : '▸'}</span>
          Measurement equations y = h(x)
        </button>

        {showMeasurements && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-stone-500">
              Leave empty for full state observation (y = x). Otherwise define each output below.
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-stone-500">
                  <th className="text-left pb-1 w-1/3">Name</th>
                  <th className="text-left pb-1">h(x)</th>
                  <th className="pb-1 w-6" />
                </tr>
              </thead>
              <tbody>
                {data.measurementExpressions.map((expr, i) => (
                  <tr key={i} className="group">
                    <td className="pr-1 pb-1">
                      <input
                        className={inputCls}
                        placeholder="y1"
                        value={data.measurementNames[i]?.name ?? ''}
                        onChange={(e) => setMeasurementName(i, e.target.value)}
                      />
                    </td>
                    <td className="pr-1 pb-1">
                      <input
                        className={`${inputCls} font-mono`}
                        placeholder="x1 + x2"
                        value={expr}
                        onChange={(e) => setMeasurementExpr(i, e.target.value)}
                      />
                    </td>
                    <td className="pb-1 text-center">
                      <button
                        className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-rose-400"
                        onClick={() => removeMeasurement(i)}
                      >×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              className="text-xs text-teal-400 hover:text-teal-300"
              onClick={addMeasurement}
            >
              + Add measurement
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
