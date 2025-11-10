'use client';

import { ReactNode, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { getOrCreateDeviceId } from '@/lib/device';
import { loadReducedMotion } from '@/lib/motion';

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

  return <AnimatePresence mode="wait">{children}</AnimatePresence>;
};

export default Providers;
