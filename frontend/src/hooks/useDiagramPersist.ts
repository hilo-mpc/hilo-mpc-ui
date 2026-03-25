import { useCallback } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { useReactFlow } from '@xyflow/react';
import type { DiagramSchema } from '../types/diagram';

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useDiagramPersist() {
  const { getViewport } = useReactFlow();

  const save = useCallback(async () => {
    const { nodes, edges } = useDiagramStore.getState();
    const schema: DiagramSchema = {
      version: '1.0',
      id: makeId(),
      name: 'My Diagram',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes,
      edges,
      viewport: getViewport(),
    };
    const json = JSON.stringify(schema, null, 2);

    // Electron path
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      await (window as any).electronAPI.saveFile(json);
      return;
    }

    // Browser fallback: trigger download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.hilo';
    a.click();
    URL.revokeObjectURL(url);
  }, [getViewport]);

  const load = useCallback(async () => {
    let json: string | null = null;

    // Electron path
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      json = await (window as any).electronAPI.openFile();
    } else {
      // Browser fallback: file picker
      json = await new Promise<string | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.hilo,application/json';
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) { resolve(null); return; }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsText(file);
        };
        input.click();
      });
    }

    if (!json) return;
    try {
      const schema: DiagramSchema = JSON.parse(json);
      useDiagramStore.getState().loadDiagram(schema.nodes, schema.edges);
    } catch (err) {
      console.error('Failed to parse diagram file', err);
    }
  }, []);

  return { save, load };
}
