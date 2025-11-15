'use client';

import { useMemo } from 'react';
import { useResolvedDeviceId } from './useResolvedDeviceId';

interface UseDeviceJourneyOptions {
  autoloadStats?: boolean;
}

export const useDeviceJourney = (_options: UseDeviceJourneyOptions = {}) => {
  const { deviceId, status, resolving, error, refresh } = useResolvedDeviceId();
  const loading = resolving || status === 'idle';

  return useMemo(
    () => ({
      deviceId,
      stats: null,
      loading,
      error,
      refresh,
    }),
    [deviceId, error, loading, refresh],
  );
};
