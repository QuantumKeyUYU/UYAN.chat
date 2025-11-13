'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface RepliesState {
  unreadCount: number;
  lastRepliesSeenAt: number | null;
  initialized: boolean;
  loading: boolean;
  error: string | null;
  setUnreadCount: (count: number) => void;
  setLastRepliesSeenAt: (value: number | null) => void;
  setInitialized: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  reset: () => void;
}

export const useRepliesStore = create<RepliesState>()(
  subscribeWithSelector((set) => ({
    unreadCount: 0,
    lastRepliesSeenAt: null,
    initialized: false,
    loading: false,
    error: null,
    setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
    setLastRepliesSeenAt: (value) => set({ lastRepliesSeenAt: value }),
    setInitialized: (value) => set({ initialized: value }),
    setLoading: (value) => set({ loading: value }),
    setError: (value) => set({ error: value }),
    reset: () =>
      set({
        unreadCount: 0,
        lastRepliesSeenAt: null,
        initialized: false,
        loading: false,
        error: null,
      }),
  })),
);
