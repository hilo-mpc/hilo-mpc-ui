import { useDiagramStore } from '../store/diagramStore';
import { useSimulationStore } from '../store/simulationStore';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import type { PlotBlockData, ModelBlockData } from '../types/blocks';

interface Props {
  nodeId: string;
}

export function PlotPanel({ nodeId }: Props) {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const { getNode, updateNodeData } = useDiagramStore();
  const node = getNode(nodeId);
  if (!node || node.data.blockType !== 'plot') return null;
  const data = node.data as PlotBlockData;

  // Find connected Simulation node → its connected Model node → state names
  const simEdge = edges.find(
    (e) => e.target === nodeId && e.targetHandle === 'plot-data-in'
  );
  const simNode = simEdge ? nodes.find((n) => n.id === simEdge.source) : undefined;
  const simNodeId = simNode?.id ?? null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const series = useSimulationStore((s) => (simNodeId ? (s.runs[simNodeId]?.series ?? []) : []));

  const modelEdge = simNode
    ? edges.find((e) => e.target === simNode.id && e.targetHandle === 'sim-model-in')
    : undefined;
  const modelNode = modelEdge ? nodes.find((n) => n.id === modelEdge.source) : undefined;
  const modelData = modelNode?.data.blockType === 'model'
    ? (modelNode.data as ModelBlockData)
    : null;

  const isMpc = simNode?.data.blockType === 'mpc';
  const availableVars = [
    ...(modelData?.states.map((s) => s.name) ?? []),
    // For MPC connections also expose inputs (controller outputs)
    ...(isMpc ? (modelData?.inputs.map((i) => i.name) ?? []) : []),
  ];

  function patch(partial: Partial<PlotBlockData>) {
    const next = { ...data, ...partial };
    const configured = next.yAxes.length > 0;
    updateNodeData(nodeId, { ...partial, configured });
  }

  function toggleAxis(name: string) {
    const axes = data.yAxes.includes(name)
      ? data.yAxes.filter((a) => a !== name)
      : [...data.yAxes, name];
    patch({ yAxes: axes });
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

      <div>
        <label className="block text-xs text-stone-400 mb-1">Chart title</label>
        <input
          className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1 text-white"
          value={data.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </div>

      {/* Y-axis variable selector */}
      <section>
        <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
          Variables to plot
        </span>
        {availableVars.length === 0 ? (
          <p className="mt-1 text-xs text-stone-500 italic">
            Connect a Model → Simulation → this Plot block to see available variables.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {availableVars.map((name) => {
              const active = data.yAxes.includes(name);
              return (
                <button
                  key={name}
                  onClick={() => toggleAxis(name)}
                  className={`px-3 py-1 rounded text-xs font-mono border transition-colors ${
                    active
                      ? 'bg-orange-700 border-orange-500 text-white'
                      : 'bg-stone-700 border-stone-600 text-stone-400 hover:border-stone-400'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Live chart preview */}
      {series.length > 0 && data.yAxes.length > 0 && (
        <section>
          <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
            Preview
          </span>
          <div className="mt-2">
            <TimeSeriesChart series={series} yAxes={data.yAxes} height={200} />
          </div>
        </section>
      )}
    </div>
  );
}
