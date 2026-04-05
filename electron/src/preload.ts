import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (content: string): Promise<string | null> =>
    ipcRenderer.invoke('save-file', content),

  saveFileTo: (filePath: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke('save-file-to', filePath, content),

  openFile: (): Promise<string | null> =>
    ipcRenderer.invoke('open-file'),

  openFileWithPath: (): Promise<{ content: string; filePath: string } | null> =>
    ipcRenderer.invoke('open-file-with-path'),

  getBackendPort: (): number => 8765,
});
