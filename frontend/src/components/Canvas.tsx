import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Connection,
  type IsValidConnection,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useDiagramStore } from '../store/diagramStore';
import { useUIStore } from '../store/uiStore';
import { nodeTypes } from '../nodes';
import type { BlockType } from '../types/blocks';

const VALID_CONNECTIONS: Record<string, string[]> = {
  'sim-model-in':       ['model-out'],
  'mpc-model-in':       ['model-out'],
  'mpc-measurement-in': ['plant-measurement-out'],
  'plant-control-in':   ['mpc-control-out'],
  'plot-data-in':       ['sim-results-out', 'mpc-results-out', 'plant-states-out'],
};

const isValidConnection: IsValidConnection = (connection: Connection) => {
  const targetHandle = connection.targetHandle;
  if (!targetHandle) return true;
  const validSources = VALID_CONNECTIONS[targetHandle];
  if (!validSources) return true;
  return validSources.includes(connection.sourceHandle ?? '');
};

export function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } = useDiagramStore();
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const edgeVariant = useUIStore((s) => s.edgeVariant);
  const { screenToFlowPosition } = useReactFlow();

  // Apply selected type and wider click area to all edges without mutating the store
  const displayEdges = edges.map((e) => ({
    ...e,
    type: edgeVariant === 'straight' ? 'straight' : edgeVariant === 'rounded' ? 'smoothstep' : 'default',
    ...(edgeVariant === 'rounded' ? { pathOptions: { borderRadius: 12 } } : {}),
    interactionWidth: 20,
    style: {
      stroke: e.selected ? '#a78bfa' : '#57534e',
      strokeWidth: e.selected ? 2.5 : 2,
    },
  }));

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const blockType = event.dataTransfer.getData('application/hilo-block') as BlockType;
      if (!blockType) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(blockType, position);
    },
    [screenToFlowPosition, addNode]
  );

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={(_e, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
        fitView
        deleteKeyCode="Delete"
        elevateEdgesOnSelect
        className="bg-stone-950"
        defaultEdgeOptions={{ style: { stroke: '#57534e', strokeWidth: 2 } }}
      >
        <Background color="#1c1917" gap={20} />
        <Controls
          className="!bg-stone-800 !border-stone-700"
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'model': return '#9f1239';
              case 'simulation': return '#92400e';
              case 'mpc': return '#6d28d9';
              case 'plant': return '#0f766e';
              case 'plot': return '#9a3412';
              default: return '#57534e';
            }
          }}
          className="!bg-stone-800 !border-stone-700"
          maskColor="rgba(12,10,9,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
