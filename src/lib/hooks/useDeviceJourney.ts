'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getOrCreateDeviceId } from '@/lib/device';
import { DEVICE_ID_HEADER } from '@/lib/device/constants';
import { useDeviceStore } from '@/store/device';
import { UserStatsSnapshot, useStatsStore } from '@/store/stats';

interface UseDeviceJourneyOptions {
  autoloadStats?: boolean;
}

const fetchStats = async (deviceId: string): Promise<UserStatsSnapshot | null> => {
  try {
    const response = await fetch('/api/stats/user', {
      headers: { [DEVICE_ID_HEADER]: deviceId },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn('[useDeviceJourney] Failed to fetch stats', response.status);
      return null;
    }

    const data = (await response.json()) as { stats?: UserStatsSnapshot };
    return data.stats ?? null;
  } catch (error) {
    console.warn('[useDeviceJourney] Stats request failed', error);
    return null;
  }
};

export const useDeviceJourney = ({ autoloadStats = true }: UseDeviceJourneyOptions = {}) => {
  const deviceId = useDeviceStore((state) => state.id);
  const setDeviceId = useDeviceStore((state) => state.setId);
  const stats = useStatsStore((state) => state.data);
  const setStats = useStatsStore((state) => state.setData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      try {
        if (!initializedRef.current) {
          initializedRef.current = true;
        }

        let resolvedId = deviceId;
        if (!resolvedId) {
          resolvedId = getOrCreateDeviceId();
          setDeviceId(resolvedId);
        }

        if (!resolvedId) {
          setLoading(false);
          return;
        }

        if (!autoloadStats) {
          setLoading(false);
          return;
        }

        if (stats) {
          setLoading(false);
          return;
        }

        setError(null);
        setLoading(true);
        const nextStats = await fetchStats(resolvedId);
        if (cancelled) return;
        if (nextStats) {
          setStats(nextStats);
        }
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.warn('[useDeviceJourney] Failed to resolve journey', err);
        setError('Не удалось загрузить путь устройства.');
        setLoading(false);
      }
    };

    void resolve();

    return () => {
      cancelled = true;
    };
  }, [autoloadStats, deviceId, setDeviceId, setStats, stats, setError, setLoading]);

  const refresh = useCallback(async () => {
    const currentId = deviceId ?? getOrCreateDeviceId();
    if (!currentId) return;
    setError(null);
    setLoading(true);
    const nextStats = await fetchStats(currentId);
    if (nextStats) {
      setStats(nextStats);
    }
    setLoading(false);
  }, [deviceId, setError, setStats, setLoading]);

  return useMemo(
    () => ({
      deviceId,
      stats,
      loading,
      error,
      refresh,
    }),
    [deviceId, error, loading, refresh, stats],
  );
};
