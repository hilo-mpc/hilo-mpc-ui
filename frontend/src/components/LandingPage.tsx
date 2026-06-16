import { useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useBackendHealth } from '../hooks/useBackendHealth';
import type { DiagramSchema } from '../types/diagram';
import { setHandle, hasFileSystemAccess } from '../lib/fileHandles';

type PickResult = { json: string; filePath: string | null; handle?: FileSystemFileHandle };

async function pickFile(): Promise<PickResult | null> {
  if ((window as any).electronAPI?.openFileWithPath) {
    const result = await (window as any).electronAPI.openFileWithPath();
    if (!result) return null;
    return { json: result.content, filePath: result.filePath };
  }
  if ((window as any).electronAPI?.openFile) {
    const json = await (window as any).electronAPI.openFile();
    if (!json) return null;
    return { json, filePath: null };
  }
  if (hasFileSystemAccess()) {
    try {
      const [handle]: FileSystemFileHandle[] = await (window as any).showOpenFilePicker({
        types: [{ description: 'HILO Diagram', accept: { 'application/json': ['.hilo'] } }],
      });
      const file = await handle.getFile();
      const json = await file.text();
      return { json, filePath: null, handle };
    } catch {
      return null;
    }
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.hilo,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve({ json: reader.result as string, filePath: null });
      reader.readAsText(file);
    };
    input.click();
  });
}

interface Props {
  onOpen: (id: string) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

function ProjectCard({
  project,
  onOpen,
  onDelete,
  onRename,
}: {
  project: DiagramSchema;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);

  function commitRename() {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== project.name) onRename(trimmed);
    setEditing(false);
  }

  const blockCount = project.nodes.length;

  return (
    <div className="bg-stone-800 rounded-lg border border-stone-700 hover:border-stone-500 transition-colors p-4 flex flex-col gap-3">
      {editing ? (
        <input
          autoFocus
          className="bg-stone-700 border border-rose-500 rounded px-2 py-1 text-sm text-white focus:outline-none"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') { setEditName(project.name); setEditing(false); }
          }}
        />
      ) : (
        <h3
          className="text-white font-medium text-sm cursor-text hover:text-rose-300 transition-colors truncate"
          onDoubleClick={() => { setEditName(project.name); setEditing(true); }}
          title="Double-click to rename"
        >
          {project.name}
        </h3>
      )}

      <div className="text-xs text-stone-500 space-y-0.5">
        <div>{blockCount} block{blockCount !== 1 ? 's' : ''}</div>
        <div>Updated {formatDate(project.updatedAt)}</div>
      </div>

      <div className="flex items-center gap-2 mt-auto pt-1">
        <button
          onClick={onOpen}
          className="flex-1 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors"
        >
          Open
        </button>
        <button
          onClick={onDelete}
          className="py-1.5 px-2.5 rounded text-stone-500 hover:text-red-400 hover:bg-stone-700 text-xs transition-colors"
          title="Delete project"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function LandingPage({ onOpen }: Props) {
  const { projects, createProject, importProject, deleteProject, renameProject, setProjectFilePath } = useProjectStore();
  const { status: health, hiloVersion } = useBackendHealth();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  async function handleLoadFromFile() {
    const picked = await pickFile();
    if (!picked) return;
    try {
      const schema: DiagramSchema = JSON.parse(picked.json);
      const id = importProject(schema);
      if (picked.filePath) setProjectFilePath(id, picked.filePath);
      if (picked.handle) setHandle(id, picked.handle);
      onOpen(id);
    } catch {
      // ignore malformed files
    }
  }

  const sorted = Object.values(projects).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  function handleCreate() {
    const name = newName.trim() || 'Untitled project';
    const id = createProject(name);
    setNewName('');
    setCreating(false);
    onOpen(id);
  }

  return (
    <div className="flex flex-col h-screen bg-stone-950 text-white">
      {/* Header */}
      <header className="h-14 bg-stone-900 border-b border-stone-700 flex items-center px-8 shrink-0">
        <span className="text-white font-bold text-base tracking-tight">
          HILO<span className="text-rose-400">-MPC</span>
        </span>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-lg font-semibold text-white">Projects</h1>

            {creating ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-1.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-rose-500 w-48"
                  placeholder="Project name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                    if (e.key === 'Escape') { setCreating(false); setNewName(''); }
                  }}
                />
                <button
                  onClick={handleCreate}
                  className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => { setCreating(false); setNewName(''); }}
                  className="px-3 py-1.5 rounded text-stone-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLoadFromFile}
                  className="px-4 py-2 rounded border border-stone-600 hover:border-stone-400 text-stone-300 hover:text-white text-sm font-medium transition-colors"
                >
                  Open file…
                </button>
                <button
                  onClick={() => setCreating(true)}
                  className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition-colors"
                >
                  + New Project
                </button>
              </div>
            )}
          </div>

          {sorted.length === 0 ? (
            <div className="text-center text-stone-500 py-24">
              <p className="text-base mb-1">No projects yet</p>
              <p className="text-sm">Click "+ New Project" to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onOpen={() => onOpen(p.id)}
                  onDelete={() => deleteProject(p.id)}
                  onRename={(name) => renameProject(p.id, name)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="h-6 bg-stone-950 border-t border-stone-800 flex items-center px-4 text-xs text-stone-500 shrink-0">
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${
            health === 'ok' ? 'bg-green-400' : health === 'error' ? 'bg-red-400' : 'bg-yellow-400'
          }`} />
          {health === 'ok'
            ? `Backend OK${hiloVersion ? ` · hilo-mpc ${hiloVersion}` : ''}`
            : 'Backend offline'}
        </span>
      </footer>
    </div>
  );
}
