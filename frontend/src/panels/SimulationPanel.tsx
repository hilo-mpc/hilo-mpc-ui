import { useDiagramStore } from '../store/diagramStore';
import type { SimulationBlockData, ModelBlockData, InputScheduleEntry, Solver } from '../types/blocks';

interface Props {
  nodeId: string;
}

function newScheduleEntry(): InputScheduleEntry {
  return {
    id: `${Date.now()}`,
    tStart: 0,
    tEnd: 1,
    values: {},
  };
}

export function SimulationPanel({ nodeId }: Props) {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const { getNode, updateNodeData } = useDiagramStore();
  const node = getNode(nodeId);
  if (!node || node.data.blockType !== 'simulation') return null;
  const data = node.data as SimulationBlockData;

  // Find connected Model block to auto-populate IC fields
  const modelEdge = edges.find(
    (e) => e.target === nodeId && e.targetHandle === 'sim-model-in'
  );
  const modelNode = modelEdge ? nodes.find((n) => n.id === modelEdge.source) : undefined;
  const modelData = modelNode?.data.blockType === 'model'
    ? (modelNode.data as ModelBlockData)
    : null;

  const stateNames = modelData?.states.map((s) => s.name) ?? [];
  const inputNames = modelData?.inputs.map((i) => i.name) ?? [];

  function patch(partial: Partial<SimulationBlockData>) {
    const next = { ...data, ...partial };
    const configured =
      next.dt > 0 &&
      next.tEnd > next.dt &&
      stateNames.every((s) => next.initialConditions[s] !== undefined);
    updateNodeData(nodeId, { ...partial, configured });
  }

  function setIC(name: string, value: number) {
    patch({ initialConditions: { ...data.initialConditions, [name]: value } });
  }

  function addScheduleEntry() {
    patch({ inputSchedule: [...data.inputSchedule, newScheduleEntry()] });
  }

  function updateScheduleEntry(id: string, field: keyof InputScheduleEntry, value: any) {
    patch({
      inputSchedule: data.inputSchedule.map((e) =>
        e.id === id ? { ...e, [field]: value } : e
      ),
    });
  }

  function updateScheduleInputValue(entryId: string, inputName: string, value: number) {
    patch({
      inputSchedule: data.inputSchedule.map((e) =>
        e.id === entryId ? { ...e, values: { ...e.values, [inputName]: value } } : e
      ),
    });
  }

  function removeScheduleEntry(id: string) {
    patch({ inputSchedule: data.inputSchedule.filter((e) => e.id !== id) });
  }

  return (
    <div className="p-4 space-y-5 text-sm text-stone-200">
      {/* Label */}
      <div>
        <label className="block text-xs text-stone-400 mb-1">Block label</label>
        <input
          className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1 text-white"
          value={data.label}
          onChange={(e) => patch({ label: e.target.value })}
        />
      </div>

      {/* Timing */}
      <section>
        <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">Timing</span>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-stone-400 mb-1">dt (s)</label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1 text-white"
              value={data.dt}
              onChange={(e) => patch({ dt: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">T end (s)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1 text-white"
              value={data.tEnd}
              onChange={(e) => patch({ tEnd: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      </section>

      {/* Solver */}
      <section>
        <label className="block text-xs text-stone-400 mb-1">Integrator</label>
        <select
          className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1 text-white"
          value={data.solver}
          onChange={(e) => patch({ solver: e.target.value as Solver })}
        >
          <option value="cvodes">cvodes (CasADi default)</option>
          <option value="rk4">rk4 (Runge-Kutta 4)</option>
          <option value="idas">idas (DAE)</option>
        </select>
      </section>

      {/* Initial conditions */}
      {stateNames.length > 0 && (
        <section>
          <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
            Initial Conditions
          </span>
          <div className="mt-2 space-y-1">
            {stateNames.map((name) => (
              <div key={name} className="flex items-center gap-2">
                <label className="text-xs text-stone-400 w-16 shrink-0 font-mono">{name}(0)</label>
                <input
                  type="number"
                  step="any"
                  className="flex-1 bg-stone-700 border border-stone-600 rounded px-2 py-0.5 text-white text-xs"
                  value={data.initialConditions[name] ?? ''}
                  onChange={(e) => setIC(name, parseFloat(e.target.value) || 0)}
                />
              </div>
            ))}
          </div>
        </section>
      )}
      {stateNames.length === 0 && (
        <p className="text-xs text-stone-500 italic">Connect a Model block to set initial conditions.</p>
      )}

      {/* Input schedule */}
      {inputNames.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Input Schedule (open-loop)
            </span>
            <button
              className="text-xs text-amber-400 hover:text-amber-300"
              onClick={addScheduleEntry}
            >
              + Add
            </button>
          </div>
          {data.inputSchedule.length === 0 && (
            <p className="text-xs text-stone-500 italic">
              No schedule — inputs default to 0.
            </p>
          )}
          {data.inputSchedule.map((entry) => (
            <div
              key={entry.id}
              className="mb-2 p-2 bg-stone-700 rounded border border-stone-600 text-xs"
            >
              <div className="flex gap-2 mb-1">
                <div className="flex-1">
                  <label className="text-stone-400">t start</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full mt-0.5 bg-stone-800 border border-stone-600 rounded px-1.5 py-0.5 text-white"
                    value={entry.tStart}
                    onChange={(e) =>
                      updateScheduleEntry(entry.id, 'tStart', parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="flex-1">
                  <label className="text-stone-400">t end</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full mt-0.5 bg-stone-800 border border-stone-600 rounded px-1.5 py-0.5 text-white"
                    value={entry.tEnd}
                    onChange={(e) =>
                      updateScheduleEntry(entry.id, 'tEnd', parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
              {inputNames.map((inp) => (
                <div key={inp} className="flex items-center gap-2 mt-1">
                  <label className="text-stone-400 w-12 font-mono">{inp}</label>
                  <input
                    type="number"
                    step="any"
                    className="flex-1 bg-stone-800 border border-stone-600 rounded px-1.5 py-0.5 text-white"
                    value={entry.values[inp] ?? 0}
                    onChange={(e) =>
                      updateScheduleInputValue(entry.id, inp, parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              ))}
              <button
                className="mt-1 text-xs text-rose-400 hover:text-rose-300"
                onClick={() => removeScheduleEntry(entry.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
