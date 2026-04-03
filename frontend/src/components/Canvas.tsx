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

const VALID_CONNECTIONS: Record<string, string> = {
  'sim-model-in': 'model-out',
  'plot-data-in': 'sim-results-out',
};

const isValidConnection: IsValidConnection = (connection: Connection) => {
  const targetHandle = connection.targetHandle;
  if (!targetHandle) return true;
  const requiredSource = VALID_CONNECTIONS[targetHandle];
  if (!requiredSource) return true;
  return connection.sourceHandle === requiredSource;
};

export function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } = useDiagramStore();
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const { screenToFlowPosition } = useReactFlow();

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
        edges={edges}
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
