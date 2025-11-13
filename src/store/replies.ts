'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface RepliesState {
  unreadCount: number;
  initialized: boolean;
  loading: boolean;
  setUnreadCount: (count: number) => void;
  setInitialized: (value: boolean) => void;
  setLoading: (value: boolean) => void;
}

export const useRepliesStore = create<RepliesState>()(
  subscribeWithSelector((set) => ({
    unreadCount: 0,
    initialized: false,
    loading: false,
    setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
    setInitialized: (value) => set({ initialized: value }),
    setLoading: (value) => set({ loading: value }),
  })),
);
