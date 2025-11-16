'use client';

import { create } from 'zustand';

export type BackendStatus = 'online' | 'offline' | 'degraded' | 'demo';

interface BackendState {
  status: BackendStatus;
  db: 'ok' | 'error' | null;
  moderation: 'ok' | 'error' | null;
  lastCheckedAt: number | null;
  error: string | null;
  setState: (state: Partial<BackendState>) => void;
}

export const useBackendStore = create<BackendState>((set) => ({
  status: 'demo',
  db: null,
  moderation: null,
  lastCheckedAt: null,
  error: null,
  setState: (state) => set(state),
}));
