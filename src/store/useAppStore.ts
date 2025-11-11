'use client';

import { create } from 'zustand';
import { DEVICE_ID_HEADER } from '@/lib/device/constants';
import { clearPersistedDeviceId, persistDeviceId } from '@/lib/device';

type NullableTimestamp = number | null;

export interface UserStatsSnapshot {
  deviceId: string;
  lightsGiven: number;
  lightsReceived: number;
  messagesSent: number;
  karmaScore: number;
  createdAt: NullableTimestamp;
  lastActiveAt: NullableTimestamp;
}

interface AppState {
  deviceId: string | null;
  stats: UserStatsSnapshot | null;
  reducedMotion: boolean;
  setDeviceId: (deviceId: string | null) => void;
  setStats: (stats: UserStatsSnapshot | null) => void;
  setReducedMotion: (value: boolean) => void;
  loadStats: () => Promise<void>;
}

interface UserStatsResponse {
  stats: UserStatsSnapshot;
}

export const useAppStore = create<AppState>((set, get) => ({
  deviceId: null,
  stats: null,
  reducedMotion: false,
  setDeviceId: (deviceId) => {
    set({ deviceId });

    if (typeof window === 'undefined') {
      return;
    }

    if (deviceId) {
      persistDeviceId(deviceId);
    } else {
      clearPersistedDeviceId();
    }
  },
  setStats: (stats) => set({ stats }),
  setReducedMotion: (value) => set({ reducedMotion: value }),
  loadStats: async () => {
    const deviceId = get().deviceId;
    if (!deviceId) return;

    try {
      const response = await fetch('/api/stats/user', {
        headers: { [DEVICE_ID_HEADER]: deviceId },
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user stats');
      }
      const data = (await response.json()) as UserStatsResponse;
      set({ stats: data.stats });
    } catch (error) {
      console.error('[store] Failed to load user stats', error);
    }
  },
}));
