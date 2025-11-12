'use client';

import { PropsWithChildren } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';
import { useSettingsStore } from '@/store/settings';

export const PageTransition = ({ children }: PropsWithChildren<{}>): JSX.Element => {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotionSetting = useSettingsStore((state) => state.reducedMotion);
  const disableMotion = prefersReducedMotion || reducedMotionSetting;

  const initial = disableMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 };
  const animate = { opacity: 1, y: 0 };
  const exit = disableMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 };
  const transition = disableMotion ? { duration: 0 } : { duration: 0.18 };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={pathname} initial={initial} animate={animate} exit={exit} transition={transition}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
