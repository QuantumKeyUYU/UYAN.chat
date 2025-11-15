'use client';

import { useCallback, useMemo, useState } from 'react';
import { DEVICE_ID_HEADER } from '@/lib/device/constants';
import { useUserStats } from '@/lib/hooks/useUserStats';
import { useResolvedDeviceId } from '@/lib/hooks/useResolvedDeviceId';

export const useRepliesBadge = () => {
  const { state, refresh, markRepliesSeenLocal } = useUserStats();
  const { deviceId } = useResolvedDeviceId();
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
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (deviceId) {
        headers[DEVICE_ID_HEADER] = deviceId;
      }
      const response = await fetch('/api/responses/mark-seen', {
        method: 'POST',
        headers,
      });
      if (!response.ok) {
        throw new Error('Failed to mark replies as seen');
      }
      markRepliesSeenLocal();
      await refresh();
    } catch (error) {
      console.warn('[useRepliesBadge] Failed to mark replies as seen', error);
    } finally {
      setMarking(false);
    }
  }, [deviceId, hasUnseenReplies, markRepliesSeenLocal, refresh, state.status]);

  const value = useMemo(
    () => ({
      count,
      hasUnseenReplies,
      loading: loading || marking,
      refresh,
      markAllSeen,
      syncFromMessages: () => {},
    }),
    [count, hasUnseenReplies, loading, marking, markAllSeen, refresh],
  );

  return value;
};
