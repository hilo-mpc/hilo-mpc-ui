import { useCallback, useEffect } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { useReactFlow } from '@xyflow/react';
import type { DiagramSchema } from '../types/diagram';
import { getHandle, setHandle, hasFileSystemAccess } from '../lib/fileHandles';

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function downloadJson(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function writeToHandle(handle: FileSystemFileHandle, json: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(json);
  await writable.close();
}

async function pickSaveHandle(filename: string): Promise<FileSystemFileHandle | null> {
  try {
    return await (window as any).showSaveFilePicker({
      suggestedName: filename,
      types: [{ description: 'HILO Diagram', accept: { 'application/json': ['.hilo'] } }],
    });
  } catch {
    return null;
  }
}

function buildSchema(name: string, id: string, viewport: ReturnType<ReturnType<typeof useReactFlow>['getViewport']>): DiagramSchema {
  const { nodes, edges } = useDiagramStore.getState();
  return {
    version: '1.0',
    id,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes,
    edges,
    viewport,
  };
}

function flashSaved() {
  useUIStore.getState().setSavedFlash(true);
  setTimeout(() => useUIStore.getState().setSavedFlash(false), 2500);
}

export function useDiagramPersist() {
  const { getViewport, fitView, zoomIn, zoomOut } = useReactFlow();
  const { currentProjectId, saveDiagram, setProjectFilePath } = useProjectStore();

  // Auto-save every 5 minutes
  useEffect(() => {
    if (!currentProjectId) return;
    const id = setInterval(() => {
      const state = useProjectStore.getState();
      const project = state.projects[currentProjectId];
      if (!project) return;
      const { nodes, edges } = useDiagramStore.getState();
      const vp = getViewport();
      state.saveDiagram(currentProjectId, nodes, edges, vp);

      if (project.filePath && (window as any).electronAPI?.saveFileTo) {
        const schema = buildSchema(project.name, currentProjectId, vp);
        (window as any).electronAPI.saveFileTo(project.filePath, JSON.stringify(schema, null, 2));
      }
      flashSaved();
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [currentProjectId, getViewport]);

  // Save to file (reuses existing handle/path; prompts only on first save)
  const saveFile = useCallback(async () => {
    if (!currentProjectId) return;
    const project = useProjectStore.getState().projects[currentProjectId];
    const { nodes, edges } = useDiagramStore.getState();
    const vp = getViewport();
    saveDiagram(currentProjectId, nodes, edges, vp);

    const schema = buildSchema(project?.name ?? 'diagram', currentProjectId, vp);
    const json = JSON.stringify(schema, null, 2);
    const filename = `${project?.name ?? 'diagram'}.hilo`;

    if ((window as any).electronAPI) {
      if (project?.filePath) {
        await (window as any).electronAPI.saveFileTo(project.filePath, json);
      } else {
        const path = await (window as any).electronAPI.saveFile(json);
        if (path) setProjectFilePath(currentProjectId, path);
        else return;
      }
      flashSaved();
    } else if (hasFileSystemAccess()) {
      let handle = getHandle(currentProjectId);
      if (!handle) {
        handle = await pickSaveHandle(filename);
        if (!handle) return;
        setHandle(currentProjectId, handle);
      }
      await writeToHandle(handle, json);
      flashSaved();
    } else {
      downloadJson(json, filename);
      flashSaved();
    }
  }, [currentProjectId, saveDiagram, getViewport, setProjectFilePath]);

  // Save As — always prompts for a new location
  const saveFileAs = useCallback(async () => {
    if (!currentProjectId) return;
    const project = useProjectStore.getState().projects[currentProjectId];
    const { nodes, edges } = useDiagramStore.getState();
    const vp = getViewport();
    saveDiagram(currentProjectId, nodes, edges, vp);

    const schema = buildSchema(project?.name ?? 'diagram', currentProjectId, vp);
    const json = JSON.stringify(schema, null, 2);
    const filename = `${project?.name ?? 'diagram'}.hilo`;

    if ((window as any).electronAPI) {
      const path = await (window as any).electronAPI.saveFile(json);
      if (path) { setProjectFilePath(currentProjectId, path); flashSaved(); }
    } else if (hasFileSystemAccess()) {
      const handle = await pickSaveHandle(filename);
      if (!handle) return;
      setHandle(currentProjectId, handle);
      await writeToHandle(handle, json);
      flashSaved();
    } else {
      downloadJson(json, filename);
      flashSaved();
    }
  }, [currentProjectId, saveDiagram, getViewport, setProjectFilePath]);

  // Open a .hilo file and load it into the current project
  const openDiagramFile = useCallback(async () => {
    if (!currentProjectId) return;
    let json: string | null = null;
    let filePath: string | null = null;

    if ((window as any).electronAPI?.openFileWithPath) {
      const result = await (window as any).electronAPI.openFileWithPath();
      if (!result) return;
      json = result.content;
      filePath = result.filePath;
    } else if ((window as any).electronAPI) {
      json = await (window as any).electronAPI.openFile();
    } else if (hasFileSystemAccess()) {
      try {
        const [handle]: FileSystemFileHandle[] = await (window as any).showOpenFilePicker({
          types: [{ description: 'HILO Diagram', accept: { 'application/json': ['.hilo'] } }],
        });
        const file = await handle.getFile();
        json = await file.text();
        // Reuse this handle for subsequent saves
        setHandle(currentProjectId, handle as unknown as FileSystemFileHandle);
      } catch {
        return;
      }
    } else {
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
      if (filePath) setProjectFilePath(currentProjectId, filePath);
    } catch (err) {
      console.error('Failed to parse diagram file', err);
    }
  }, [currentProjectId, setProjectFilePath]);

  return { saveFile, saveFileAs, openDiagramFile, fitView, zoomIn, zoomOut };
}
