import type { BlockType } from '../types/blocks';

interface BlockDef {
  type: BlockType;
  label: string;
  description: string;
  color: string;
  headerColor: string;
}

const BLOCKS: BlockDef[] = [
  {
    type: 'model',
    label: 'Model',
    description: 'Define system dynamics (states, inputs, ODEs)',
    color: 'border-blue-700 bg-slate-800 hover:border-blue-500',
    headerColor: 'bg-blue-700',
  },
  {
    type: 'simulation',
    label: 'Simulation',
    description: 'Configure and run open-loop simulation',
    color: 'border-emerald-700 bg-slate-800 hover:border-emerald-500',
    headerColor: 'bg-emerald-700',
  },
  {
    type: 'plot',
    label: 'Plot',
    description: 'Visualise simulation results in real-time',
    color: 'border-violet-700 bg-slate-800 hover:border-violet-500',
    headerColor: 'bg-violet-700',
  },
];

export function Sidebar() {
  function onDragStart(event: React.DragEvent, type: BlockType) {
    event.dataTransfer.setData('application/hilo-block', type);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <aside className="w-52 shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col overflow-y-auto">
      <div className="px-3 py-3 border-b border-slate-700">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Block Palette</p>
        <p className="text-xs text-slate-500 mt-0.5">Drag blocks onto the canvas</p>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {BLOCKS.map((b) => (
          <div
            key={b.type}
            draggable
            onDragStart={(e) => onDragStart(e, b.type)}
            className={`rounded-lg border-2 cursor-grab active:cursor-grabbing select-none transition-colors overflow-hidden ${b.color}`}
          >
            <div className={`${b.headerColor} px-2 py-1`}>
              <span className="text-xs font-bold text-white uppercase tracking-wider">{b.label}</span>
            </div>
            <div className="px-2 py-1.5">
              <p className="text-xs text-slate-400 leading-tight">{b.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto px-3 py-3 border-t border-slate-700">
        <p className="text-xs text-slate-600">Stage 1 — Simulation</p>
      </div>
    </aside>
  );
}
