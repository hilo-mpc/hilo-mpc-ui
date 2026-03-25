import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';

export function registerIpcHandlers(win: BrowserWindow): void {
  ipcMain.handle('save-file', async (_event, content: string) => {
    const result = await dialog.showSaveDialog(win, {
      title: 'Save Diagram',
      defaultPath: 'diagram.hilo',
      filters: [{ name: 'HILO Diagram', extensions: ['hilo'] }],
    });
    if (result.canceled || !result.filePath) return null;
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return result.filePath;
  });

  ipcMain.handle('open-file', async (_event) => {
    const result = await dialog.showOpenDialog(win, {
      title: 'Open Diagram',
      filters: [{ name: 'HILO Diagram', extensions: ['hilo'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return fs.readFileSync(result.filePaths[0], 'utf-8');
  });
}
