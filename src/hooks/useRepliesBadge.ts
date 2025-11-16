'use client';

import { useCallback, useMemo, useState } from 'react';
import { useUserStats } from '@/lib/hooks/useUserStats';

export const useRepliesBadge = () => {
  const { state, refresh, markRepliesSeenLocal } = useUserStats();
  const [marking, setMarking] = useState(false);

  const count = state.status === 'ready' ? state.data.answersUnread : 0;
  const hasUnseenReplies = count > 0;
  const loading = state.status === 'loading';

  const markAllSeen = useCallback(async () => {
    if (!hasUnseenReplies) {
      if (state.status !== 'error') {
        markRepliesSeenLocal();
      }
      return;
    }

    setMarking(true);
    try {
      markRepliesSeenLocal();
      await refresh();
    } catch (error) {
      console.warn('[useRepliesBadge] Failed to refresh replies badge state', error);
    } finally {
      setMarking(false);
    }
  }, [hasUnseenReplies, markRepliesSeenLocal, refresh, state.status]);

  const syncFromMessages = useCallback(
    (_messages?: unknown) => {
      // This hook relies on the shared stats context for state management.
      // The method exists to satisfy callers that optionally pass message data
      // when syncing badge state, but no extra handling is currently required
      // here because the provider already tracks unread counts.
      return;
    },
    [],
  );

  const value = useMemo(
    () => ({
      count,
      hasUnseenReplies,
      loading: loading || marking,
      refresh,
      markAllSeen,
      syncFromMessages,
    }),
    [count, hasUnseenReplies, loading, marking, markAllSeen, refresh, syncFromMessages],
  );

  return value;
};
