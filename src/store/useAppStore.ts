'use client';

import { create } from 'zustand';
import type { UserStats } from '@/types/firestore';

interface AppState {
  deviceId: string | null;
  stats: UserStats | null;
  setDeviceId: (deviceId: string) => void;
  setStats: (stats: UserStats | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  deviceId: null,
  stats: null,
  setDeviceId: (deviceId) => set({ deviceId }),
  setStats: (stats) => set({ stats }),
}));
