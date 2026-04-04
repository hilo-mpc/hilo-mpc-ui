import { useDiagramStore } from '../store/diagramStore';
import { useSimulationStore } from '../store/simulationStore';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import type { PlotBlockData, ModelBlockData, PlantBlockData } from '../types/blocks';

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

  // Find source connected to plot-data-in
  const plotEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'plot-data-in');
  const sourceNode = plotEdge ? nodes.find((n) => n.id === plotEdge.source) : undefined;
  const sourceType = sourceNode?.data?.blockType;

  // Resolve run node id (for series lookup)
  // If source is Plant, the run lives in the MPC that controls it
  let runNodeId = plotEdge?.source ?? null;
  if (sourceType === 'plant') {
    const mpcEdge = edges.find(
      (e) => e.source === runNodeId && e.sourceHandle === 'plant-measurement-out'
    );
    if (mpcEdge) runNodeId = mpcEdge.target;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const series = useSimulationStore((s) => (runNodeId ? (s.runs[runNodeId]?.series ?? []) : []));

  // Derive available variable names depending on source type
  let availableVars: string[] = [];

  if (sourceType === 'simulation') {
    // Find Model connected to Simulation
    const modelEdge = edges.find(
      (e) => e.target === sourceNode!.id && e.targetHandle === 'sim-model-in'
    );
    const modelNode = modelEdge ? nodes.find((n) => n.id === modelEdge.source) : undefined;
    const modelData = modelNode?.data.blockType === 'model' ? (modelNode.data as ModelBlockData) : null;
    availableVars = modelData?.states.map((s) => s.name) ?? [];
  } else if (sourceType === 'mpc') {
    // Find Plant connected to MPC measurement input
    const plantEdge = edges.find(
      (e) => e.target === sourceNode!.id && e.targetHandle === 'mpc-measurement-in'
    );
    const plantNode = plantEdge ? nodes.find((n) => n.id === plantEdge.source) : undefined;
    const plantData = plantNode?.data.blockType === 'plant' ? (plantNode.data as PlantBlockData) : null;
    if (plantData) {
      availableVars = [
        ...plantData.states.map((s) => s.name),
        ...plantData.inputs.map((i) => i.name),
        ...plantData.measurementNames.map((m) => m.name).filter((n) => n.trim()),
      ];
    }
  } else if (sourceType === 'plant') {
    // Direct plant-states-out connection: plant drives the series (via its MPC)
    const plantData = sourceNode!.data as PlantBlockData;
    availableVars = [
      ...plantData.states.map((s) => s.name),
      ...plantData.inputs.map((i) => i.name),
      ...plantData.measurementNames.map((m) => m.name).filter((n) => n.trim()),
    ];
  }

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

  const noConnectionMsg =
    'Connect a Simulation, MPC results, or Plant states output to this Plot block.';

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
          <p className="mt-1 text-xs text-stone-500 italic">{noConnectionMsg}</p>
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
