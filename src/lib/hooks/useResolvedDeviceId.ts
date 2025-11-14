'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getOrCreateDeviceId } from '@/lib/device';
import { useDeviceStore } from '@/store/device';

type DeviceResolutionStatus = 'idle' | 'resolving' | 'ready' | 'error';

interface UseResolvedDeviceIdResult {
  deviceId: string | null;
  status: DeviceResolutionStatus;
  resolving: boolean;
  ready: boolean;
  error: string | null;
  refresh: () => Promise<string | null>;
}

export const useResolvedDeviceId = (): UseResolvedDeviceIdResult => {
  const deviceId = useDeviceStore((state) => state.id);
  const setDeviceId = useDeviceStore((state) => state.setId);
  const [status, setStatus] = useState<DeviceResolutionStatus>(deviceId ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const resolvingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetStatus = useCallback(
    (nextStatus: DeviceResolutionStatus) => {
      if (!mountedRef.current) return;
      setStatus(nextStatus);
    },
    [],
  );

  const safeSetError = useCallback((nextError: string | null) => {
    if (!mountedRef.current) return;
    setError(nextError);
  }, []);

  const resolve = useCallback(async (): Promise<string | null> => {
    if (typeof window === 'undefined') {
      return null;
    }

    if (deviceId) {
      safeSetStatus('ready');
      safeSetError(null);
      return deviceId;
    }

    if (resolvingRef.current) {
      return null;
    }

    resolvingRef.current = true;
    safeSetStatus('resolving');
    safeSetError(null);

    try {
      const resolvedId = getOrCreateDeviceId();
      if (!resolvedId) {
        throw new Error('Device id is empty');
      }
      setDeviceId(resolvedId);
      safeSetStatus('ready');
      safeSetError(null);
      return resolvedId;
    } catch (resolutionError) {
      console.error('[useResolvedDeviceId] Failed to resolve device id', resolutionError);
      safeSetStatus('error');
      safeSetError('Не удалось подготовить устройство.');
      return null;
    } finally {
      resolvingRef.current = false;
    }
  }, [deviceId, safeSetError, safeSetStatus, setDeviceId]);

  useEffect(() => {
    if (deviceId) {
      safeSetStatus('ready');
      safeSetError(null);
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    void resolve();
  }, [deviceId, resolve, safeSetError, safeSetStatus]);

  const refresh = useCallback(async () => resolve(), [resolve]);

  const result = useMemo(
    () => ({
      deviceId,
      status,
      resolving: status === 'resolving',
      ready: status === 'ready' && Boolean(deviceId),
      error,
      refresh,
    }),
    [deviceId, error, refresh, status],
  );

  return result;
};

export default useResolvedDeviceId;
