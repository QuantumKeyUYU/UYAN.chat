'use client';

import { ReactNode, useCallback, useEffect } from 'react';

import Providers from '@/components/layout/Providers';
import { useBackendStore, type BackendStatus } from '@/store/backend';

const resolveStatus = (db: 'ok' | 'error', moderation: 'ok' | 'error'): BackendStatus => {
  if (db === 'ok' && moderation === 'ok') {
    return 'online';
  }
  return 'degraded';
};

const ClientProviders = ({ children }: { children: ReactNode }) => {
  const setBackendState = useBackendStore((state) => state.setState);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/health', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Health check failed');
      }
      const payload = (await response.json().catch(() => null)) as {
        db?: 'ok' | 'error';
        moderation?: 'ok' | 'error';
      } | null;
      const db = payload?.db === 'ok' ? 'ok' : 'error';
      const moderation = payload?.moderation === 'ok' ? 'ok' : 'error';
      setBackendState({
        status: resolveStatus(db, moderation),
        db,
        moderation,
        error: null,
        lastCheckedAt: Date.now(),
      });
    } catch (error) {
      const fallbackStatus: BackendStatus = process.env.NODE_ENV === 'development' ? 'demo' : 'offline';
      setBackendState({
        status: fallbackStatus,
        db: null,
        moderation: null,
        error: error instanceof Error ? error.message : 'Health check failed',
        lastCheckedAt: Date.now(),
      });
    }
  }, [setBackendState]);

  useEffect(() => {
    refresh().catch((error) => {
      console.error('[client-providers] Failed to refresh backend status', error);
    });
  }, [refresh]);

  return <Providers>{children}</Providers>;
};

export default ClientProviders;
