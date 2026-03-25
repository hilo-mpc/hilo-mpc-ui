import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export type BackendStatus = 'checking' | 'ok' | 'error';

export function useBackendHealth(intervalMs = 3000): {
  status: BackendStatus;
  hiloVersion: string;
} {
  const [status, setStatus] = useState<BackendStatus>('checking');
  const [hiloVersion, setHiloVersion] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const resp = await apiClient.get<{ status: string; hilo_mpc_version: string }>(
          '/health',
          { timeout: 2000 }
        );
        if (!cancelled) {
          setStatus(resp.data.status === 'ok' ? 'ok' : 'error');
          setHiloVersion(resp.data.hilo_mpc_version ?? '');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    check();
    const id = setInterval(check, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { status, hiloVersion };
}
