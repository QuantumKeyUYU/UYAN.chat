'use client';

import { useCallback, useEffect } from 'react';
import { DEVICE_ID_HEADER } from '@/lib/device/constants';
import {
  getLastRepliesSeenAt,
  LAST_REPLIES_SEEN_EVENT,
  LAST_REPLIES_SEEN_KEY,
  setLastRepliesSeenAt,
} from '@/lib/repliesBadge';
import { useDeviceStore } from '@/store/device';
import { useRepliesStore, type ReplyEntry } from '@/store/replies';

type RawReply = {
  id?: string;
  createdAt?: unknown;
  seenAt?: unknown;
  seen?: boolean;
};

type RawMessage = {
  id?: string;
  responses?: RawReply[];
};

const getMillis = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (value && typeof (value as { toMillis?: () => unknown }).toMillis === 'function') {
    const millis = (value as { toMillis: () => unknown }).toMillis();
    if (typeof millis === 'number') return millis;
  }
  return 0;
};

const getMillisOrNull = (value: unknown): number | null => {
  const millis = getMillis(value);
  return Number.isFinite(millis) && millis > 0 ? millis : null;
};

const extractReplies = (messages: RawMessage[]): ReplyEntry[] => {
  const replies = new Map<string, ReplyEntry>();

  messages.forEach((message) => {
    const messageId = typeof message?.id === 'string' ? message.id : null;
    if (!Array.isArray(message?.responses)) return;

    message.responses.forEach((rawReply) => {
      if (!rawReply || typeof rawReply.id !== 'string') return;
      const createdAt = getMillis(rawReply.createdAt);
      if (!Number.isFinite(createdAt) || createdAt <= 0) return;

      replies.set(rawReply.id, {
        id: rawReply.id,
        messageId,
        createdAt,
        seenAt: getMillisOrNull(rawReply.seenAt),
        seen: Boolean(rawReply.seen),
      });
    });
  });

  return Array.from(replies.values());
};

export const useRepliesBadge = () => {
  const deviceId = useDeviceStore((state) => state.id);
  const unseenCount = useRepliesStore((state) => state.unseenCount);
  const loading = useRepliesStore((state) => state.loading);
  const initialized = useRepliesStore((state) => state.initialized);
  const lastSeenAt = useRepliesStore((state) => state.lastSeenAt);
  const replaceReplies = useRepliesStore((state) => state.replaceReplies);
  const markAllSeenLocal = useRepliesStore((state) => state.markAllSeenLocal);
  const setInitialized = useRepliesStore((state) => state.setInitialized);
  const setLoading = useRepliesStore((state) => state.setLoading);
  const setLastSeenAt = useRepliesStore((state) => state.setLastSeenAt);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = getLastRepliesSeenAt();
    setLastSeenAt(stored);
  }, [setLastSeenAt]);

  const refresh = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const headers = { [DEVICE_ID_HEADER]: deviceId };
      const [metaResult, messagesResult] = await Promise.allSettled([
        fetch('/api/responses/unread', { headers, cache: 'no-store' }),
        fetch('/api/messages/my', { headers, cache: 'no-store' }),
      ]);

      let serverLastSeen: number | null = null;

      if (metaResult.status === 'fulfilled' && metaResult.value.ok) {
        try {
          const metaData = await metaResult.value.json();
          if (typeof metaData?.lastRepliesSeenAt === 'number') {
            serverLastSeen = metaData.lastRepliesSeenAt;
          }
        } catch (error) {
          console.warn('[useRepliesBadge] Failed to parse unread meta', error);
        }
      }

      if (serverLastSeen != null) {
        setLastRepliesSeenAt(serverLastSeen);
        setLastSeenAt(serverLastSeen);
      } else {
        const stored = getLastRepliesSeenAt();
        if (stored != null) {
          setLastSeenAt(stored);
        }
      }

      let replies: ReplyEntry[] = [];
      if (messagesResult.status === 'fulfilled' && messagesResult.value.ok) {
        try {
          const data = await messagesResult.value.json();
          const rawMessages = Array.isArray(data?.messages) ? (data.messages as RawMessage[]) : [];
          replies = extractReplies(rawMessages);
        } catch (error) {
          console.warn('[useRepliesBadge] Failed to parse replies payload', error);
        }
      }

      const effectiveLastSeen = serverLastSeen ?? getLastRepliesSeenAt() ?? lastSeenAt ?? null;
      replaceReplies(replies, { lastSeenAt: effectiveLastSeen });
    } catch (error) {
      console.warn('[useRepliesBadge] Failed to refresh replies badge', error);
    } finally {
      setInitialized(true);
      setLoading(false);
    }
  }, [deviceId, lastSeenAt, replaceReplies, setInitialized, setLastSeenAt, setLoading]);

  const syncFromMessages = useCallback(
    (messages: unknown[], options?: { lastSeenAt?: number | null }) => {
      const rawMessages = Array.isArray(messages) ? (messages as RawMessage[]) : [];
      const replies = extractReplies(rawMessages);
      replaceReplies(replies, options);
      setInitialized(true);
      setLoading(false);
    },
    [replaceReplies, setInitialized, setLoading],
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
        setLastSeenAt(getLastRepliesSeenAt());
        void refresh();
      }
    };

    const handleCustom = (event: Event) => {
      const detailValue = (event as CustomEvent<{ value?: unknown }>).detail?.value;
      if (typeof detailValue === 'number' && Number.isFinite(detailValue)) {
        setLastSeenAt(detailValue);
      } else {
        setLastSeenAt(getLastRepliesSeenAt());
      }
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
  }, [refresh, setLastSeenAt]);

  const markAllSeen = useCallback(async () => {
    if (unseenCount <= 0) {
      return;
    }

    const optimisticTimestamp = Date.now();
    markAllSeenLocal(optimisticTimestamp);
    setLastRepliesSeenAt(optimisticTimestamp);
    setLastSeenAt(optimisticTimestamp);

    if (!deviceId) {
      return;
    }

    try {
      const response = await fetch('/api/responses/mark-seen', {
        method: 'POST',
        headers: { [DEVICE_ID_HEADER]: deviceId },
      });
      if (!response.ok) {
        throw new Error('Failed to persist mark-seen state');
      }
      const data = await response.json();
      const serverTimestamp =
        typeof data?.lastRepliesSeenAt === 'number' ? data.lastRepliesSeenAt : optimisticTimestamp;
      markAllSeenLocal(serverTimestamp);
      setLastRepliesSeenAt(serverTimestamp);
      setLastSeenAt(serverTimestamp);
    } catch (error) {
      console.warn('[useRepliesBadge] Failed to persist seen status', error);
    }
  }, [deviceId, markAllSeenLocal, setLastSeenAt, unseenCount]);

  return {
    count: unseenCount,
    hasUnseenReplies: unseenCount > 0,
    loading,
    refresh,
    markAllSeen,
    syncFromMessages,
  };
};
