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
    color: 'border-rose-700 bg-stone-800 hover:border-rose-500',
    headerColor: 'bg-rose-700',
  },
  {
    type: 'simulation',
    label: 'Simulation',
    description: 'Configure and run open-loop simulation',
    color: 'border-amber-700 bg-stone-800 hover:border-amber-500',
    headerColor: 'bg-amber-700',
  },
  {
    type: 'mpc',
    label: 'MPC',
    description: 'Nonlinear MPC closed-loop control (NMPC via IPOPT)',
    color: 'border-violet-700 bg-stone-800 hover:border-violet-500',
    headerColor: 'bg-violet-700',
  },
  {
    type: 'plot',
    label: 'Plot',
    description: 'Visualise simulation results in real-time',
    color: 'border-orange-700 bg-stone-800 hover:border-orange-500',
    headerColor: 'bg-orange-700',
  },
];

export function Sidebar() {
  function onDragStart(event: React.DragEvent, type: BlockType) {
    event.dataTransfer.setData('application/hilo-block', type);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <aside className="w-52 shrink-0 bg-stone-900 border-r border-stone-700 flex flex-col overflow-y-auto">
      <div className="px-3 py-3 border-b border-stone-700">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Block Palette</p>
        <p className="text-xs text-stone-500 mt-0.5">Drag blocks onto the canvas</p>
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
              <p className="text-xs text-stone-400 leading-tight">{b.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto px-3 py-3 border-t border-stone-700">
        <p className="text-xs text-stone-600">Stage 2 — MPC</p>
      </div>
    </aside>
  );
}
