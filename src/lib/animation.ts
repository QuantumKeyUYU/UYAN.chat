import { useSettingsStore } from '@/store/settings';

export const useSoftMotion = () => {
  const reduced = useSettingsStore((state) => state.reducedMotion);

  if (reduced) {
    return {
      initial: { opacity: 1, y: 0, scale: 1 },
      animate: { opacity: 1, y: 0, scale: 1 },
      transition: { duration: 0 },
    } as const;
  }

  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: 'easeOut' },
  } as const;
};
