import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (content: string): Promise<string | null> =>
    ipcRenderer.invoke('save-file', content),

  openFile: (): Promise<string | null> =>
    ipcRenderer.invoke('open-file'),

  getBackendPort: (): number => 8765,
});
