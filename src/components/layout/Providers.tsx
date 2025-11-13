'use client';

import { ReactNode, useEffect } from 'react';
import { useDeviceJourney } from '@/lib/hooks/useDeviceJourney';
import { useRepliesStatus } from '@/lib/hooks/useRepliesStatus';
import { useSettingsStore } from '@/store/settings';

interface ProvidersProps {
  children: ReactNode;
}

const Providers = ({ children }: ProvidersProps) => {
  useDeviceJourney();
  useRepliesStatus();
  const setReducedMotion = useSettingsStore((state) => state.setReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, [setReducedMotion]);

  return <>{children}</>;
};

export default Providers;
