import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { PlantBlockData } from '../types/blocks';

export function PlantNode({ data, selected }: NodeProps<PlantBlockData>) {
  const L = data.flipped ? Position.Right : Position.Left;
  const R = data.flipped ? Position.Left : Position.Right;
  const nMeasurements = data.measurementExpressions.length || data.states.length;

  return (
    <div
      className={`rounded-lg border-2 min-w-[160px] shadow-lg overflow-hidden transition-all ${
        selected ? 'border-teal-400' : data.configured ? 'border-teal-600' : 'border-stone-600'
      }`}
    >
      {/* Header */}
      <div className="bg-teal-700 px-3 py-1.5 flex items-center gap-2">
        <span className="text-xs font-bold text-white uppercase tracking-wider">Plant</span>
        {data.configured && (
          <span className="ml-auto w-2 h-2 rounded-full bg-green-400" title="Configured" />
        )}
      </div>

      {/* Body */}
      <div className="bg-stone-800 px-3 py-2 text-xs text-stone-300 space-y-1">
        <div className="font-semibold text-white truncate">{data.label}</div>
        {data.states.length > 0 ? (
          <div className="text-stone-400">
            {data.states.length} state{data.states.length !== 1 ? 's' : ''} &nbsp;|&nbsp;{' '}
            {data.inputs.length} input{data.inputs.length !== 1 ? 's' : ''}
          </div>
        ) : (
          <div className="text-stone-500 italic">Not configured</div>
        )}
        <div className="text-stone-400">
          y: {nMeasurements} output{nMeasurements !== 1 ? 's' : ''}
          {data.measurementExpressions.length === 0 && data.states.length > 0 && (
            <span className="text-stone-500"> (full state)</span>
          )}
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={L}
        id="plant-control-in"
        className="!w-3 !h-3 !bg-teal-400 !border-2 !border-stone-800"
        title="Control input from MPC"
      />
      <Handle
        type="source"
        position={R}
        id="plant-measurement-out"
        style={{ top: '35%' }}
        className="!w-3 !h-3 !bg-violet-400 !border-2 !border-stone-800"
        title="Measurement output to MPC"
      />
      <Handle
        type="source"
        position={R}
        id="plant-states-out"
        style={{ top: '70%' }}
        className="!w-3 !h-3 !bg-orange-400 !border-2 !border-stone-800"
        title="Plant states for plotting"
      />
    </div>
  );
}
