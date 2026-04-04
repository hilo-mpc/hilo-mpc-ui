import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Connection,
  type IsValidConnection,
  type Node,
  type Edge,
  useReactFlow,
  useUpdateNodeInternals,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useDiagramStore } from '../store/diagramStore';
import { useUIStore } from '../store/uiStore';
import { nodeTypes } from '../nodes';
import { edgeTypes } from '../edges';
import type { BlockType } from '../types/blocks';

const VALID_CONNECTIONS: Record<string, string[]> = {
  'sim-model-in':       ['model-out'],
  'mpc-model-in':       ['model-out'],
  'mpc-measurement-in': ['plant-measurement-out', 'mhe-states-out'],
  'plant-control-in':   ['mpc-control-out'],
  'plot-data-in':       ['sim-results-out', 'mpc-results-out', 'plant-states-out', 'ann-results-out', 'fn-output', 'mhe-states-out'],
  'ann-data-in':        ['data-out'],
  'fn-input':           ['data-out'],
  'mhe-model-in':       ['model-out'],
  'mhe-data-in':        ['data-out'],
};

const isValidConnection: IsValidConnection = (connection: Connection) => {
  const targetHandle = connection.targetHandle;
  if (!targetHandle) return true;
  const validSources = VALID_CONNECTIONS[targetHandle];
  if (!validSources) return true;
  return validSources.includes(connection.sourceHandle ?? '');
};

interface ContextMenu {
  nodeId?: string;
  edgeId?: string;
  x: number;
  y: number;
}

export function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, duplicateNode, deleteNode, deleteEdge, updateNodeData } = useDiagramStore();
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const edgeVariant = useUIStore((s) => s.edgeVariant);
  const { screenToFlowPosition } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!contextMenu) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setContextMenu(null); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [contextMenu]);

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    setContextMenu({ nodeId: node.id, x: e.clientX, y: e.clientY });
  }, []);

  const onEdgeContextMenu = useCallback((e: React.MouseEvent, edge: Edge) => {
    e.preventDefault();
    setContextMenu({ edgeId: edge.id, x: e.clientX, y: e.clientY });
  }, []);

  // Apply selected type and wider click area to all edges without mutating the store
  const displayEdges = edges.map((e) => ({
    ...e,
    type: edgeVariant === 'straight' ? 'straight' : edgeVariant === 'rounded' ? 'customSmoothStep' : 'customBezier',
    interactionWidth: 20,
    style: {
      stroke: e.selected ? '#a8a29e' : '#57534e',
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
    <div className="flex-1 h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={(_e, node) => { setSelectedNodeId(node.id); setContextMenu(null); }}
        onPaneClick={() => { setSelectedNodeId(null); setContextMenu(null); }}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
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
              case 'data': return '#0369a1';
              case 'ann': return '#4338ca';
              case 'function': return '#065f46';
              case 'mhe': return '#86198f';
              default: return '#57534e';
            }
          }}
          className="!bg-stone-800 !border-stone-700"
          maskColor="rgba(12,10,9,0.7)"
        />
      </ReactFlow>

      {/* Context menu */}
      {contextMenu && (
        <>
          {/* Invisible backdrop to catch outside clicks */}
          <div
            className="fixed inset-0 z-40"
            onMouseDown={() => setContextMenu(null)}
          />
          <div
            ref={menuRef}
            className="fixed z-50 bg-stone-800 border border-stone-700 rounded-lg shadow-xl overflow-hidden text-xs"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.nodeId ? (
              <>
                <button
                  className="w-full text-left px-4 py-2 text-stone-200 hover:bg-stone-700 transition-colors flex items-center gap-2"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    duplicateNode(contextMenu.nodeId!);
                    setContextMenu(null);
                  }}
                >
                  <span className="text-stone-400">⧉</span>
                  Duplicate
                </button>
                <div className="h-px bg-stone-700" />
                <button
                  className="w-full text-left px-4 py-2 text-stone-200 hover:bg-stone-700 transition-colors flex items-center gap-2"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const nid = contextMenu.nodeId!;
                    const node = nodes.find((n) => n.id === nid);
                    updateNodeData(nid, { flipped: !(node?.data as { flipped?: boolean })?.flipped });
                    // After flipping, React Flow must re-measure handle DOM positions
                    // to re-route connected edges. setTimeout defers until after render.
                    setTimeout(() => updateNodeInternals(nid), 0);
                    setContextMenu(null);
                  }}
                >
                  <span className="text-stone-400">⇔</span>
                  Flip
                </button>
                <div className="h-px bg-stone-700" />
                <button
                  className="w-full text-left px-4 py-2 text-rose-400 hover:bg-stone-700 transition-colors flex items-center gap-2"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    deleteNode(contextMenu.nodeId!);
                    setContextMenu(null);
                  }}
                >
                  <span>✕</span>
                  Delete
                </button>
              </>
            ) : (
              <button
                className="w-full text-left px-4 py-2 text-rose-400 hover:bg-stone-700 transition-colors flex items-center gap-2"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  deleteEdge(contextMenu.edgeId!);
                  setContextMenu(null);
                }}
              >
                <span>✕</span>
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
