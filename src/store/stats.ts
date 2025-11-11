'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface UserStatsSnapshot {
  deviceId: string;
  lightsGiven: number;
  lightsReceived: number;
  messagesSent: number;
  karmaScore: number;
  createdAt: number | null;
  lastActiveAt: number | null;
}

interface StatsState {
  data: UserStatsSnapshot | null;
  setData: (stats: UserStatsSnapshot | null) => void;
}

export const useStatsStore = create<StatsState>()(
  subscribeWithSelector((set) => ({
    data: null,
    setData: (stats) => set({ data: stats }),
  })),
);
