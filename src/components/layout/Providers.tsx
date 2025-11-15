'use client';

import { ReactNode, useEffect } from 'react';
import { useRepliesBadge } from '@/hooks/useRepliesBadge';
import { useSettingsStore } from '@/store/settings';
import { UserStatsProvider } from '@/lib/hooks/useUserStats';
import { useDeviceJourney } from '@/lib/hooks/useDeviceJourney';

interface ProvidersProps {
  children: ReactNode;
}

const Providers = ({ children }: ProvidersProps) => {
  useDeviceJourney({ autoloadStats: false });
  useRepliesBadge();
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

  return <UserStatsProvider>{children}</UserStatsProvider>;
};

export default Providers;
