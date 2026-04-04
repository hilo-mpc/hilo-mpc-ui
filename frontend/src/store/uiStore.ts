import { create } from 'zustand';

export type EdgeVariant = 'bezier' | 'straight' | 'rounded';

interface UIState {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  edgeVariant: EdgeVariant;
  setEdgeVariant: (v: EdgeVariant) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  edgeVariant: 'bezier',
  setEdgeVariant: (v) => set({ edgeVariant: v }),
}));
