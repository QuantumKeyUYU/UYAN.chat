'use client';

import { ReactNode, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { getOrCreateDeviceId } from '@/lib/device';
import { loadReducedMotion } from '@/lib/motion';
import { DEVICE_ID_HEADER } from '@/lib/device/constants';

interface ProvidersProps {
  children: ReactNode;
}

const Providers = ({ children }: ProvidersProps) => {
  const setDeviceId = useAppStore((state) => state.setDeviceId);
  const deviceId = useAppStore((state) => state.deviceId);
  const loadStats = useAppStore((state) => state.loadStats);
  const setReducedMotion = useAppStore((state) => state.setReducedMotion);

  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
  }, [setDeviceId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setReducedMotion(loadReducedMotion());
  }, [setReducedMotion]);

  useEffect(() => {
    if (!deviceId) return;
    void loadStats();
  }, [deviceId, loadStats]);

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;

    const syncPortablePath = async () => {
      try {
        const response = await fetch('/api/journey/status', {
          headers: { [DEVICE_ID_HEADER]: deviceId },
          cache: 'no-store',
        });
        if (!response.ok) return;
        const data = (await response.json()) as { status?: { effectiveDeviceId?: string } };
        const effectiveDeviceId = data.status?.effectiveDeviceId;
        if (!cancelled && effectiveDeviceId && effectiveDeviceId !== deviceId) {
          setDeviceId(effectiveDeviceId);
        }
      } catch (error) {
        console.warn('[providers] Failed to sync portable journey', error);
      }
    };

    void syncPortablePath();

    return () => {
      cancelled = true;
    };
  }, [deviceId, setDeviceId]);

  return <AnimatePresence mode="wait">{children}</AnimatePresence>;
};

export default Providers;
