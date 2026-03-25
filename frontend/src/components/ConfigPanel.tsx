import { useUIStore } from '../store/uiStore';
import { useDiagramStore } from '../store/diagramStore';
import { ModelPanel } from '../panels/ModelPanel';
import { SimulationPanel } from '../panels/SimulationPanel';
import { PlotPanel } from '../panels/PlotPanel';

export function ConfigPanel() {
  const selectedNodeId = useUIStore((s) => s.selectedNodeId);
  const getNode = useDiagramStore((s) => s.getNode);

  if (!selectedNodeId) {
    return (
      <aside className="w-72 shrink-0 bg-slate-900 border-l border-slate-700 flex items-center justify-center">
        <p className="text-xs text-slate-500 italic text-center px-4">
          Click a block to configure it
        </p>
      </aside>
    );
  }

  const node = getNode(selectedNodeId);
  if (!node) return null;

  const title =
    node.data.blockType === 'model'
      ? 'Model Config'
      : node.data.blockType === 'simulation'
      ? 'Simulation Config'
      : 'Plot Config';

  return (
    <aside className="w-72 shrink-0 bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{title}</span>
        <button
          className="text-slate-500 hover:text-slate-300 text-lg leading-none"
          onClick={() => useUIStore.getState().setSelectedNodeId(null)}
        >
          ×
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {node.data.blockType === 'model' && <ModelPanel nodeId={selectedNodeId} />}
        {node.data.blockType === 'simulation' && <SimulationPanel nodeId={selectedNodeId} />}
        {node.data.blockType === 'plot' && <PlotPanel nodeId={selectedNodeId} />}
      </div>
    </aside>
  );
}
