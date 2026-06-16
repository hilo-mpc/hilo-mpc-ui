// In-memory store for FileSystemFileHandle objects, keyed by project ID.
// File handles are not serializable so they cannot live in Zustand/localStorage.
// They survive for the lifetime of the tab, giving us overwrite-in-place on
// subsequent Ctrl+S calls without re-prompting the user.

const handles = new Map<string, FileSystemFileHandle>();

export function getHandle(projectId: string): FileSystemFileHandle | undefined {
  return handles.get(projectId);
}

export function setHandle(projectId: string, handle: FileSystemFileHandle): void {
  handles.set(projectId, handle);
}

export function hasFileSystemAccess(): boolean {
  return typeof (window as any).showSaveFilePicker === 'function';
}
