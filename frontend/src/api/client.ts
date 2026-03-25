import axios from 'axios';

function getBaseUrl(): string {
  // In Electron, electronAPI is exposed via preload
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    const port = (window as any).electronAPI.getBackendPort() as number;
    return `http://127.0.0.1:${port}`;
  }
  // Web: use env variable or default
  return import.meta.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:8765';
}

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10_000,
});

export function getWsBaseUrl(): string {
  return getBaseUrl().replace(/^http/, 'ws');
}
