import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import { startPython, stopPython, waitForBackend } from './pythonSidecar';
import { registerIpcHandlers } from './ipc/handlers';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const VITE_DEV_URL = 'http://localhost:5173';

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'HILO-MPC UI',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Open external links in the default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return win;
}

app.whenReady().then(async () => {
  startPython();

  mainWindow = createWindow();
  registerIpcHandlers(mainWindow);

  // Show a loading screen while the backend starts
  mainWindow.loadURL(
    isDev ? `${VITE_DEV_URL}/loading.html` : `file://${path.join(__dirname, '../frontend/index.html')}`
  );

  try {
    await waitForBackend(15_000);
    console.log('[main] Backend ready');
  } catch (err) {
    console.error('[main] Backend failed to start:', err);
  }

  if (isDev) {
    mainWindow.loadURL(VITE_DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/index.html'));
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopPython();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopPython();
});
