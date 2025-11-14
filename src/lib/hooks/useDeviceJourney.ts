'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEVICE_ID_HEADER } from '@/lib/device/constants';
import { UserStatsSnapshot, useStatsStore } from '@/store/stats';
import { useResolvedDeviceId } from './useResolvedDeviceId';

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
  const stats = useStatsStore((state) => state.data);
  const setStats = useStatsStore((state) => state.setData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { deviceId, status: deviceStatus, resolving: deviceResolving, error: deviceError, refresh: refreshDevice } =
    useResolvedDeviceId();

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      try {
        if (!autoloadStats) {
          setLoading(false);
          return;
        }

        if (!deviceId) {
          if (deviceStatus === 'error') {
            setError(deviceError ?? 'Не удалось подготовить устройство.');
            setLoading(false);
          } else if (!stats) {
            setLoading(deviceResolving || deviceStatus === 'idle');
          }
          return;
        }

        if (stats) {
          setLoading(false);
          setError(null);
          return;
        }

        setError(null);
        setLoading(true);
        const nextStats = await fetchStats(deviceId);
        if (cancelled) return;
        if (nextStats) {
          setStats(nextStats);
        } else if (!cancelled) {
          setError('Не удалось загрузить путь устройства.');
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
  }, [autoloadStats, deviceId, deviceError, deviceResolving, deviceStatus, setStats, stats]);

  const refresh = useCallback(async () => {
    const currentId = deviceId ?? (await refreshDevice());
    if (!currentId) {
      setError('Не удалось подготовить устройство.');
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    const nextStats = await fetchStats(currentId);
    if (nextStats) {
      setStats(nextStats);
    }
    setLoading(false);
  }, [deviceId, refreshDevice, setStats]);

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
