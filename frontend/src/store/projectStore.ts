import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DiagramSchema, DiagramNode, DiagramEdge } from '../types/diagram';
import type { Viewport } from '@xyflow/react';

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface ProjectStore {
  projects: Record<string, DiagramSchema>;
  currentProjectId: string | null;

  createProject: (name: string) => string;
  openProject: (id: string) => void;
  closeProject: () => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  saveDiagram: (id: string, nodes: DiagramNode[], edges: DiagramEdge[], viewport?: Viewport) => void;
  setProjectFilePath: (id: string, filePath: string) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projects: {},
      currentProjectId: null,

      createProject: (name) => {
        const id = makeId();
        const now = new Date().toISOString();
        const schema: DiagramSchema = {
          version: '1.0',
          id,
          name,
          createdAt: now,
          updatedAt: now,
          nodes: [],
          edges: [],
        };
        set((s) => ({ projects: { ...s.projects, [id]: schema } }));
        return id;
      },

      openProject: (id) => set({ currentProjectId: id }),

      closeProject: () => set({ currentProjectId: null }),

      deleteProject: (id) =>
        set((s) => {
          const { [id]: _removed, ...rest } = s.projects;
          return {
            projects: rest,
            currentProjectId: s.currentProjectId === id ? null : s.currentProjectId,
          };
        }),

      renameProject: (id, name) =>
        set((s) => ({
          projects: {
            ...s.projects,
            [id]: { ...s.projects[id], name, updatedAt: new Date().toISOString() },
          },
        })),

      saveDiagram: (id, nodes, edges, viewport) =>
        set((s) => ({
          projects: {
            ...s.projects,
            [id]: {
              ...s.projects[id],
              nodes,
              edges,
              ...(viewport ? { viewport } : {}),
              updatedAt: new Date().toISOString(),
            },
          },
        })),

      setProjectFilePath: (id, filePath) =>
        set((s) => ({
          projects: {
            ...s.projects,
            [id]: { ...s.projects[id], filePath },
          },
        })),
    }),
    { name: 'hilo-mpc-projects' }
  )
);
