import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SimulationBlockData } from '../types/blocks';

export function SimulationNode({ data, selected }: NodeProps<SimulationBlockData>) {
  return (
    <div
      className={`rounded-lg border-2 min-w-[160px] shadow-lg overflow-hidden transition-all ${
        selected ? 'border-emerald-400' : data.configured ? 'border-emerald-600' : 'border-slate-600'
      }`}
    >
      {/* Header */}
      <div className="bg-emerald-700 px-3 py-1.5 flex items-center gap-2">
        <span className="text-xs font-bold text-white uppercase tracking-wider">Simulation</span>
        {data.configured && (
          <span className="ml-auto w-2 h-2 rounded-full bg-green-400" title="Configured" />
        )}
      </div>

      {/* Body */}
      <div className="bg-slate-800 px-3 py-2 text-xs text-slate-300 space-y-1">
        <div className="font-semibold text-white truncate">{data.label}</div>
        <div className="text-slate-400">
          dt = {data.dt}s &nbsp;|&nbsp; T = {data.tEnd}s
        </div>
        <div className="text-slate-400">Solver: {data.solver}</div>
      </div>

      {/* Input: model */}
      <Handle
        type="target"
        position={Position.Left}
        id="sim-model-in"
        style={{ top: '35%' }}
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-slate-800"
        title="Connect Model block here"
      />

      {/* Output: results */}
      <Handle
        type="source"
        position={Position.Right}
        id="sim-results-out"
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-slate-800"
        title="Simulation results"
      />
    </div>
  );
}
