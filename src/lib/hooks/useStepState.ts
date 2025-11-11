'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface StepStateConfig {
  total: number;
  initial?: number;
}

export const useStepState = ({ total, initial = 0 }: StepStateConfig) => {
  const [active, setActive] = useState(initial);

  useEffect(() => {
    setActive((current) => {
      if (current < total) return current;
      return Math.max(0, total - 1);
    });
  }, [total]);

  const clamp = useCallback(
    (next: number) => {
      if (Number.isNaN(next)) return 0;
      return Math.min(Math.max(next, 0), Math.max(0, total - 1));
    },
    [total],
  );

  const set = useCallback((next: number) => setActive(clamp(next)), [clamp]);
  const next = useCallback(() => setActive((current) => clamp(current + 1)), [clamp]);
  const previous = useCallback(() => setActive((current) => clamp(current - 1)), [clamp]);

  const progress = useMemo(() => {
    if (total <= 1) return 1;
    return (active + 1) / total;
  }, [active, total]);

  return useMemo(
    () => ({
      active,
      setActive: set,
      next,
      previous,
      progress,
      total,
    }),
    [active, next, previous, progress, set, total],
  );
};
