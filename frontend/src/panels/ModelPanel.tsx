import { useEffect, useRef, useState } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { validateEquations } from '../api/simulation';
import type { ModelBlockData, Variable, Parameter } from '../types/blocks';

interface Props {
  nodeId: string;
}

function newVar(): Variable { return { name: '' }; }
function newParam(): Parameter { return { name: '', value: 0 }; }

export function ModelPanel({ nodeId }: Props) {
  const node = useDiagramStore((s) => s.nodes.find((n) => n.id === nodeId));
  const { updateNodeData } = useDiagramStore();
  if (!node || node.data.blockType !== 'model') return null;
  const data = node.data as ModelBlockData;

  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [validationOk, setValidationOk] = useState<boolean | null>(null);
  const validateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recompute `configured`
  function patch(partial: Partial<ModelBlockData>) {
    const next = { ...data, ...partial };
    const configured =
      next.states.length > 0 &&
      next.states.every((s) => s.name.trim() !== '') &&
      next.odeExpressions.length === next.states.length &&
      next.odeExpressions.every((e) => e.trim() !== '');
    updateNodeData(nodeId, { ...partial, configured });
  }

  // Debounced validation
  function scheduleValidation(
    states: Variable[],
    inputs: Variable[],
    exprs: string[]
  ) {
    if (validateTimer.current) clearTimeout(validateTimer.current);
    validateTimer.current = setTimeout(async () => {
      const filledStates = states.filter((s) => s.name.trim());
      if (filledStates.length === 0 || exprs.some((e) => !e.trim())) return;
      try {
        const result = await validateEquations(filledStates, inputs.filter((i) => i.name.trim()), exprs);
        setValidationOk(result.valid);
        setValidationMsg(result.error ?? null);
      } catch {
        setValidationOk(null);
        setValidationMsg(null);
      }
    }, 600);
  }

  function setStates(states: Variable[]) {
    // Keep ode expressions aligned
    const exprs = states.map((_, i) => data.odeExpressions[i] ?? '');
    patch({ states, odeExpressions: exprs });
    scheduleValidation(states, data.inputs, exprs);
  }

  function setOde(index: number, expr: string) {
    const exprs = data.odeExpressions.map((e, i) => (i === index ? expr : e));
    patch({ odeExpressions: exprs });
    scheduleValidation(data.states, data.inputs, exprs);
  }

  function setInputs(inputs: Variable[]) {
    patch({ inputs });
  }

  return (
    <div className="p-4 space-y-5 text-sm text-slate-200">
      {/* Label */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Block label</label>
        <input
          className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white"
          value={data.label}
          onChange={(e) => patch({ label: e.target.value })}
        />
      </div>

      {/* States */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">States (x)</span>
          <button
            className="text-xs text-blue-400 hover:text-blue-300"
            onClick={() => setStates([...data.states, newVar()])}
          >
            + Add
          </button>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500">
              <th className="text-left pb-1 w-1/3">Name</th>
              <th className="text-left pb-1">ẋ = f(x, u)</th>
              <th className="pb-1 w-6" />
            </tr>
          </thead>
          <tbody>
            {data.states.map((s, i) => (
              <tr key={i} className="group">
                <td className="pr-1 pb-1">
                  <input
                    className="w-full bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-white"
                    placeholder="x"
                    value={s.name}
                    onChange={(e) => {
                      const states = data.states.map((st, j) =>
                        j === i ? { ...st, name: e.target.value } : st
                      );
                      setStates(states);
                    }}
                  />
                </td>
                <td className="pr-1 pb-1">
                  <input
                    className="w-full bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-white font-mono"
                    placeholder="v"
                    value={data.odeExpressions[i] ?? ''}
                    onChange={(e) => setOde(i, e.target.value)}
                  />
                </td>
                <td className="pb-1 text-center">
                  <button
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"
                    onClick={() => {
                      const states = data.states.filter((_, j) => j !== i);
                      setStates(states);
                    }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.states.length === 0 && (
          <p className="text-slate-500 italic text-xs">No states — click "+ Add"</p>
        )}
      </section>

      {/* Inputs */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Inputs (u)</span>
          <button
            className="text-xs text-blue-400 hover:text-blue-300"
            onClick={() => setInputs([...data.inputs, newVar()])}
          >
            + Add
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {data.inputs.map((inp, i) => (
            <div key={i} className="flex items-center gap-1 bg-slate-700 rounded px-2 py-0.5">
              <input
                className="bg-transparent text-white w-16 text-xs focus:outline-none"
                placeholder="u"
                value={inp.name}
                onChange={(e) => {
                  const inputs = data.inputs.map((v, j) =>
                    j === i ? { ...v, name: e.target.value } : v
                  );
                  setInputs(inputs);
                }}
              />
              <button
                className="text-slate-500 hover:text-red-400 text-xs"
                onClick={() => setInputs(data.inputs.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
          {data.inputs.length === 0 && (
            <span className="text-slate-500 italic text-xs">No inputs</span>
          )}
        </div>
      </section>

      {/* Validation feedback */}
      {validationOk === true && (
        <p className="text-xs text-green-400">✓ Equations look valid</p>
      )}
      {validationOk === false && validationMsg && (
        <p className="text-xs text-red-400">✗ {validationMsg}</p>
      )}
    </div>
  );
}
