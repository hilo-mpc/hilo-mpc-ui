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

  // Save to a known path without showing a dialog
  ipcMain.handle('save-file-to', async (_event, filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
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

  // Open file and return both content and path
  ipcMain.handle('open-file-with-path', async (_event) => {
    const result = await dialog.showOpenDialog(win, {
      title: 'Open Diagram',
      filters: [{ name: 'HILO Diagram', extensions: ['hilo'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    return { content, filePath };
  });
}
