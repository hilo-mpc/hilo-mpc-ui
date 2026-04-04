import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type XYPosition,
} from '@xyflow/react';
import type { DiagramNode, DiagramEdge } from '../types/diagram';
import type { BlockType, BlockData } from '../types/blocks';
import {
  defaultModelData,
  defaultSimulationData,
  defaultMpcData,
  defaultPlantData,
  defaultPlotData,
  defaultDataData,
  defaultAnnData,
  defaultFunctionData,
  defaultMheData,
} from '../types/blocks';

function makeDefaultData(type: BlockType): BlockData {
  switch (type) {
    case 'model': return defaultModelData();
    case 'simulation': return defaultSimulationData();
    case 'mpc': return defaultMpcData();
    case 'plant': return defaultPlantData();
    case 'plot': return defaultPlotData();
    case 'data': return defaultDataData();
    case 'ann': return defaultAnnData();
    case 'function': return defaultFunctionData();
    case 'mhe': return defaultMheData();
  }
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface DiagramState {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: BlockType, position: XYPosition) => string;
  duplicateNode: (id: string) => string;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  updateNodeData: (id: string, data: Partial<BlockData>) => void;
  updateEdgeData: (id: string, data: Record<string, unknown>) => void;
  getNode: (id: string) => DiagramNode | undefined;
  reset: () => void;
  loadDiagram: (nodes: DiagramNode[], edges: DiagramEdge[]) => void;
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: [],
  edges: [],

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) as DiagramNode[] });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    set({ edges: addEdge({ ...connection, animated: false }, get().edges) });
  },

  addNode: (type, position) => {
    const id = newId();
    const node: DiagramNode = {
      id,
      type,
      position,
      data: makeDefaultData(type),
    };
    set({ nodes: [...get().nodes, node] });
    return id;
  },

  duplicateNode: (id) => {
    const original = get().nodes.find((n) => n.id === id);
    if (!original) return '';
    const newNodeId = newId();
    const clone: DiagramNode = {
      ...original,
      id: newNodeId,
      position: { x: original.position.x + 40, y: original.position.y + 40 },
      selected: false,
      data: { ...original.data },
    };
    set({ nodes: [...get().nodes, clone] });
    return newNodeId;
  },

  deleteNode: (id) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
    });
  },

  deleteEdge: (id) => {
    set({ edges: get().edges.filter((e) => e.id !== id) });
  },

  updateNodeData: (id, patch) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } as BlockData } : n
      ),
    });
  },

  updateEdgeData: (id, patch) => {
    set({
      edges: get().edges.map((e) =>
        e.id === id ? { ...e, data: { ...(e.data ?? {}), ...patch } } : e
      ),
    });
  },

  getNode: (id) => get().nodes.find((n) => n.id === id),

  reset: () => set({ nodes: [], edges: [] }),

  loadDiagram: (nodes, edges) => set({ nodes, edges }),
}));
