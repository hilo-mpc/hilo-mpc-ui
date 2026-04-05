import { useState } from 'react';
import type { BlockType } from '../types/blocks';
import { useFavouritesStore } from '../store/favouritesStore';

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
    description: 'Define continuous system dynamics (states, inputs, ODEs)',
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
    type: 'plant',
    label: 'Plant',
    description: 'Real system with ODE dynamics and measurement equations',
    color: 'border-teal-700 bg-stone-800 hover:border-teal-500',
    headerColor: 'bg-teal-700',
  },
  {
    type: 'plot',
    label: 'Plot',
    description: 'Visualise simulation results in real-time',
    color: 'border-orange-700 bg-stone-800 hover:border-orange-500',
    headerColor: 'bg-orange-700',
  },
  {
    type: 'data',
    label: 'Data',
    description: 'Upload CSV data for ML training',
    color: 'border-sky-700 bg-stone-800 hover:border-sky-500',
    headerColor: 'bg-sky-700',
  },
  {
    type: 'ann',
    label: 'ANN',
    description: 'Feedforward neural network (numpy)',
    color: 'border-indigo-700 bg-stone-800 hover:border-indigo-500',
    headerColor: 'bg-indigo-700',
  },
  {
    type: 'function',
    label: 'Function',
    description: 'Evaluate arbitrary expressions on data',
    color: 'border-emerald-700 bg-stone-800 hover:border-emerald-500',
    headerColor: 'bg-emerald-700',
  },
  {
    type: 'mhe',
    label: 'MHE',
    description: 'Moving Horizon Estimator — estimate states from noisy measurements',
    color: 'border-fuchsia-700 bg-stone-800 hover:border-fuchsia-500',
    headerColor: 'bg-fuchsia-700',
  },
];

function StarButton({ type }: { type: BlockType }) {
  const { has, toggle } = useFavouritesStore();
  const starred = has(type);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggle(type); }}
      onMouseDown={(e) => e.stopPropagation()} // prevent drag triggering
      title={starred ? 'Remove from favourites' : 'Add to favourites'}
      className={`shrink-0 text-sm leading-none transition-colors px-1 py-0.5 rounded hover:bg-black/20 ${
        starred ? 'text-amber-400' : 'text-stone-600 hover:text-stone-400'
      }`}
    >
      {starred ? '★' : '☆'}
    </button>
  );
}

function BlockCard({ b, onDragStart }: { b: BlockDef; onDragStart: (e: React.DragEvent, t: BlockType) => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, b.type)}
      className={`rounded-lg border-2 cursor-grab active:cursor-grabbing select-none transition-colors overflow-hidden ${b.color}`}
    >
      <div className={`${b.headerColor} px-2 py-1 flex items-center justify-between gap-1`}>
        <span className="text-xs font-bold text-white uppercase tracking-wider">{b.label}</span>
        <StarButton type={b.type} />
      </div>
      <div className="px-2 py-1.5">
        <p className="text-xs text-stone-400 leading-tight">{b.description}</p>
      </div>
    </div>
  );
}

type Tab = 'all' | 'favourites';

export function Sidebar() {
  const [tab, setTab] = useState<Tab>('all');
  const { favourites } = useFavouritesStore();

  function onDragStart(event: React.DragEvent, type: BlockType) {
    event.dataTransfer.setData('application/hilo-block', type);
    event.dataTransfer.effectAllowed = 'move';
  }

  const displayed = tab === 'all' ? BLOCKS : BLOCKS.filter((b) => favourites.includes(b.type));

  return (
    <aside className="w-52 shrink-0 bg-stone-900 border-r border-stone-700 flex flex-col overflow-y-auto">
      {/* Tab strip */}
      <div className="flex border-b border-stone-700 shrink-0">
        {(['all', 'favourites'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === t
                ? 'text-stone-100 border-b-2 border-sky-500 bg-stone-900'
                : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'
            }`}
          >
            {t === 'all' ? 'Blocks' : (
              <span className="flex items-center justify-center gap-1">
                <span className="text-amber-400">★</span> Favourites
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Block list */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        {displayed.length === 0 ? (
          <div className="text-xs text-stone-600 text-center mt-6 px-2 leading-relaxed">
            No favourites yet.<br />
            Click the <span className="text-stone-400">☆</span> on any block to add it here.
          </div>
        ) : (
          displayed.map((b) => (
            <BlockCard key={b.type} b={b} onDragStart={onDragStart} />
          ))
        )}
      </div>

      <div className="px-3 py-2 border-t border-stone-700 shrink-0">
        <p className="text-xs text-stone-600">Stage 4 — ML</p>
      </div>
    </aside>
  );
}
