'use client';

import { useCallback, useEffect } from 'react';
import { DEVICE_ID_HEADER } from '@/lib/device/constants';
import { getLastRepliesSeenAt, LAST_REPLIES_SEEN_EVENT, LAST_REPLIES_SEEN_KEY } from '@/lib/repliesBadge';
import { useDeviceStore } from '@/store/device';
import { useRepliesStore } from '@/store/replies';

type RawReply = { createdAt?: unknown };
type RawMessage = { responses?: RawReply[] };

const getMillis = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (value && typeof (value as { toMillis?: () => unknown }).toMillis === 'function') {
    const millis = (value as { toMillis: () => unknown }).toMillis();
    if (typeof millis === 'number') return millis;
  }
  return 0;
};

const extractReplyDates = (data: unknown): number[] => {
  if (!data || typeof data !== 'object') return [];
  const messages = (data as { messages?: RawMessage[] }).messages;
  if (!Array.isArray(messages)) return [];

  const dates: number[] = [];
  messages.forEach((message) => {
    if (!message || !Array.isArray(message.responses)) return;
    message.responses.forEach((reply) => {
      const createdAt = getMillis(reply.createdAt);
      if (createdAt > 0) {
        dates.push(createdAt);
      }
    });
  });

  return dates;
};

export const computeUnreadCount = (replyDates: number[], lastSeen: number | null) => {
  if (!lastSeen) return 0;
  return replyDates.reduce((total, createdAt) => (createdAt > lastSeen ? total + 1 : total), 0);
};

export const useRepliesBadge = () => {
  const deviceId = useDeviceStore((state) => state.id);
  const unreadCount = useRepliesStore((state) => state.unreadCount);
  const loading = useRepliesStore((state) => state.loading);
  const initialized = useRepliesStore((state) => state.initialized);
  const setUnreadCount = useRepliesStore((state) => state.setUnreadCount);
  const setInitialized = useRepliesStore((state) => state.setInitialized);
  const setLoading = useRepliesStore((state) => state.setLoading);

  const refresh = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const response = await fetch('/api/messages/my', {
        headers: { [DEVICE_ID_HEADER]: deviceId },
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Failed to load replies');
      }
      const data = await response.json();
      const replyDates = extractReplyDates(data);
      const lastSeen = getLastRepliesSeenAt();
      if (!lastSeen) {
        setUnreadCount(0);
        return;
      }
      setUnreadCount(computeUnreadCount(replyDates, lastSeen));
    } catch (error) {
      console.warn('[useRepliesBadge] Failed to refresh replies badge', error);
    } finally {
      setInitialized(true);
      setLoading(false);
    }
  }, [deviceId, setInitialized, setLoading, setUnreadCount]);

  const updateFromReplyDates = useCallback(
    (replyDates: number[]) => {
      const lastSeen = getLastRepliesSeenAt();
      if (!lastSeen) {
        setUnreadCount(0);
        setInitialized(true);
        setLoading(false);
        return;
      }
      setUnreadCount(computeUnreadCount(replyDates, lastSeen));
      setInitialized(true);
      setLoading(false);
    },
    [setInitialized, setLoading, setUnreadCount],
  );

  useEffect(() => {
    if (!deviceId) return;
    if (initialized || loading) return;
    void refresh();
  }, [deviceId, initialized, loading, refresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LAST_REPLIES_SEEN_KEY) {
        void refresh();
      }
    };
    const handleCustom = () => {
      void refresh();
    };
    const handleFocus = () => {
      void refresh();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(LAST_REPLIES_SEEN_EVENT, handleCustom);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(LAST_REPLIES_SEEN_EVENT, handleCustom);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refresh]);

  const markAsSeen = useCallback(() => {
    setUnreadCount(0);
  }, [setUnreadCount]);

  return { unreadCount, loading, refresh, markAsSeen, updateFromReplyDates };
};
