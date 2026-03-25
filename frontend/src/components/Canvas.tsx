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
  // targetHandle -> acceptable sourceHandle
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
        className="bg-slate-950"
        defaultEdgeOptions={{ style: { stroke: '#475569', strokeWidth: 2 } }}
      >
        <Background color="#1e293b" gap={20} />
        <Controls
          className="!bg-slate-800 !border-slate-700"
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'model': return '#1d4ed8';
              case 'simulation': return '#047857';
              case 'plot': return '#6d28d9';
              default: return '#475569';
            }
          }}
          className="!bg-slate-800 !border-slate-700"
          maskColor="rgba(15,23,42,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
