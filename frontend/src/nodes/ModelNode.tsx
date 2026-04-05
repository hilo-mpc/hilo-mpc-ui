import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ModelBlockData } from '../types/blocks';
import { HandleTag } from './HandleTag';

export function ModelNode({ id, data, selected }: NodeProps<ModelBlockData>) {
  const Out = data.flipped ? Position.Left : Position.Right;
  const sideOut = data.flipped ? 'left' : 'right';

  return (
    <div className="relative min-w-[160px]">
      <div
        className={`rounded-lg border-2 shadow-lg overflow-hidden transition-all ${
          selected ? 'border-rose-400' : data.configured ? 'border-rose-600' : 'border-stone-600'
        }`}
      >
        <div className="bg-rose-700 px-3 py-1.5 flex items-center gap-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Model</span>
          {data.configured && (
            <span className="ml-auto w-2 h-2 rounded-full bg-green-400" title="Configured" />
          )}
        </div>

        <div className="bg-stone-800 px-3 py-2 text-xs text-stone-300 space-y-1">
          <div className="font-semibold text-white truncate">{data.label}</div>
          {data.parameters.length > 0 && (
            <div className="text-stone-400">Params: {data.parameters.map((p) => p.name).join(', ')}</div>
          )}
          {data.states.length > 0 ? (
            <div className="text-stone-400">
              States: {data.states.map((s) => s.name).join(', ')}
            </div>
          ) : (
            <div className="text-stone-500 italic">No states defined</div>
          )}
          {data.inputs.length > 0 && (
            <div className="text-stone-400">Inputs: {data.inputs.map((i) => i.name).join(', ')}</div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Out}
        id="model-out"
        className="!w-3 !h-3 !bg-rose-400 !border-2 !border-stone-800"
      />
      <HandleTag nodeId={id} handleId="model-out" label="Sim · MPC · MHE" side={sideOut} />
    </div>
  );
}
