'use client';

import { ReactNode, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { getOrCreateDeviceId } from '@/lib/device';

interface ProvidersProps {
  children: ReactNode;
}

const Providers = ({ children }: ProvidersProps) => {
  const setDeviceId = useAppStore((state) => state.setDeviceId);

  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
  }, [setDeviceId]);

  return <AnimatePresence mode="wait">{children}</AnimatePresence>;
};

export default Providers;
