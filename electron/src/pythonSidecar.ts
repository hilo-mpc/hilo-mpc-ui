import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { app } from 'electron';

const BACKEND_PORT = 8765;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

let pythonProcess: ChildProcess | null = null;

function findUvicorn(): string {
  // In packaged app, look for venv next to the app
  const resourcesPath = process.resourcesPath ?? '';
  const candidates = [
    // packaged venv
    path.join(resourcesPath, 'venv', 'bin', 'uvicorn'),
    path.join(resourcesPath, 'venv', 'Scripts', 'uvicorn.exe'),
    // development: look for venv at repo root
    path.join(app.getAppPath(), '..', '..', '.venv', 'bin', 'uvicorn'),
    path.join(app.getAppPath(), '..', '..', 'venv', 'bin', 'uvicorn'),
    // system uvicorn
    'uvicorn',
  ];

  for (const candidate of candidates) {
    if (candidate === 'uvicorn') return candidate; // fallback: PATH
    if (fs.existsSync(candidate)) return candidate;
  }
  return 'uvicorn';
}

function findBackendDir(): string {
  const resourcesPath = process.resourcesPath ?? '';
  const candidates = [
    path.join(resourcesPath, 'backend'),
    path.join(app.getAppPath(), '..', '..', 'backend'),
  ];
  for (const d of candidates) {
    if (fs.existsSync(d)) return d;
  }
  return path.join(app.getAppPath(), '..', '..', 'backend');
}

export function startPython(): void {
  const uvicorn = findUvicorn();
  const cwd = findBackendDir();

  console.log(`[sidecar] Starting uvicorn from ${cwd} using ${uvicorn}`);

  pythonProcess = spawn(
    uvicorn,
    ['main:app', '--host', '127.0.0.1', '--port', String(BACKEND_PORT), '--log-level', 'warning'],
    { cwd, stdio: 'pipe' }
  );

  pythonProcess.stdout?.on('data', (d) => process.stdout.write(`[backend] ${d}`));
  pythonProcess.stderr?.on('data', (d) => process.stderr.write(`[backend] ${d}`));
  pythonProcess.on('error', (err) => console.error('[sidecar] Failed to start:', err.message));
  pythonProcess.on('exit', (code) => console.log(`[sidecar] Exited with code ${code}`));
}

export function stopPython(): void {
  if (pythonProcess && !pythonProcess.killed) {
    console.log('[sidecar] Stopping Python backend…');
    pythonProcess.kill();
    pythonProcess = null;
  }
}

export function waitForBackend(timeoutMs = 10_000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function ping() {
      http
        .get(`${BACKEND_URL}/health`, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            retry();
          }
        })
        .on('error', retry);
    }

    function retry() {
      if (Date.now() - start > timeoutMs) {
        reject(new Error('Backend did not start in time'));
        return;
      }
      setTimeout(ping, 300);
    }

    ping();
  });
}
