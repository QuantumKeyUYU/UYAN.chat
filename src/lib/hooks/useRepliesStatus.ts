'use client';

import { useCallback, useEffect } from 'react';
import { DEVICE_ID_HEADER } from '@/lib/device/constants';
import { useDeviceStore } from '@/store/device';
import { useRepliesStore } from '@/store/replies';

interface UnreadRepliesPayload {
  unreadCount?: number;
  lastRepliesSeenAt?: number | null;
}

let lastDeviceId: string | null = null;

export const useRepliesStatus = () => {
  const deviceId = useDeviceStore((state) => state.id);
  const unreadCount = useRepliesStore((state) => state.unreadCount);
  const lastRepliesSeenAt = useRepliesStore((state) => state.lastRepliesSeenAt);
  const initialized = useRepliesStore((state) => state.initialized);
  const loading = useRepliesStore((state) => state.loading);
  const setUnreadCount = useRepliesStore((state) => state.setUnreadCount);
  const setLastRepliesSeenAt = useRepliesStore((state) => state.setLastRepliesSeenAt);
  const setInitialized = useRepliesStore((state) => state.setInitialized);
  const setLoading = useRepliesStore((state) => state.setLoading);
  const setError = useRepliesStore((state) => state.setError);
  const reset = useRepliesStore((state) => state.reset);

  useEffect(() => {
    if (!deviceId) {
      if (lastDeviceId !== null) {
        reset();
        lastDeviceId = null;
      }
      return;
    }

    if (lastDeviceId !== deviceId) {
      reset();
      lastDeviceId = deviceId;
    }
  }, [deviceId, reset]);

  const refresh = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/responses/unread', {
        headers: { [DEVICE_ID_HEADER]: deviceId },
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Failed to load unread replies');
      }
      const data = (await response.json()) as UnreadRepliesPayload;
      setUnreadCount(data.unreadCount ?? 0);
      setLastRepliesSeenAt(
        typeof data.lastRepliesSeenAt === 'number' ? data.lastRepliesSeenAt : null,
      );
    } catch (error) {
      console.warn('[useRepliesStatus] Failed to load unread replies', error);
      setError('Не удалось загрузить ответы.');
    } finally {
      setInitialized(true);
      setLoading(false);
    }
  }, [deviceId, setError, setInitialized, setLastRepliesSeenAt, setLoading, setUnreadCount]);

  const markAsSeen = useCallback(async () => {
    if (!deviceId) return;
    try {
      const response = await fetch('/api/responses/mark-seen', {
        method: 'POST',
        headers: { [DEVICE_ID_HEADER]: deviceId },
      });
      if (!response.ok) {
        throw new Error('Failed to mark replies as seen');
      }
      const data = (await response.json()) as UnreadRepliesPayload & { ok?: boolean };
      const lastSeen =
        typeof data.lastRepliesSeenAt === 'number' ? data.lastRepliesSeenAt : Date.now();
      setLastRepliesSeenAt(lastSeen);
      setUnreadCount(0);
    } catch (error) {
      console.warn('[useRepliesStatus] Failed to mark replies as seen', error);
    }
  }, [deviceId, setLastRepliesSeenAt, setUnreadCount]);

  useEffect(() => {
    if (!deviceId) return;
    if (initialized || loading) return;
    void refresh();
  }, [deviceId, initialized, loading, refresh]);

  return {
    unreadCount,
    lastRepliesSeenAt,
    loading,
    initialized,
    refresh,
    markAsSeen,
  };
};
