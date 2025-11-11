'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { StepDefinition } from './types';
import { useSettingsStore } from '@/store/settings';

interface StepperMobileProps {
  steps: StepDefinition[];
  activeIndex: number;
  progress: number;
}

export const StepperMobile = ({ steps, activeIndex, progress }: StepperMobileProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const progressWidth = `${Math.max(0, Math.min(1, progress)) * 100}%`;
  const transitionClass = useMemo(() => (reducedMotion ? 'transition-none' : 'transition-all'), [reducedMotion]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const current = container.children.item(activeIndex) as HTMLElement | null;
    if (!current) return;

    current.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
  }, [activeIndex, reducedMotion]);

  const dots = useMemo(() => steps.map((_, index) => index === activeIndex), [steps, activeIndex]);

  return (
    <div className="flex w-full flex-col gap-3 sm:hidden">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full bg-uyan-action ${transitionClass}`} style={{ width: progressWidth }} />
      </div>
      <div
        ref={containerRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
        aria-label="Ход участия"
      >
        {steps.map((step, index) => {
          const state = index < activeIndex ? 'done' : index === activeIndex ? 'current' : 'upcoming';
          const linkClass =
            state === 'current'
              ? 'border-uyan-action/60 bg-uyan-action/10 shadow-glow'
              : state === 'done'
              ? 'border-uyan-light/40 bg-uyan-darkness/10'
              : 'border-white/10 bg-bg-secondary/60';

          const content = (
            <div className={`flex min-h-[150px] w-[82vw] max-w-[300px] snap-center shrink-0 flex-col gap-2 rounded-2xl border p-4 ${transitionClass} ${linkClass}`}>
              <div className="text-xs uppercase tracking-[0.3em] text-text-tertiary">Этап {index + 1}</div>
              <p className="text-base font-semibold text-text-primary">{step.title}</p>
              {step.description ? (
                <p className="text-sm leading-relaxed text-text-secondary">{step.description}</p>
              ) : null}
            </div>
          );

          if (step.href && state !== 'current') {
            return (
              <Link
                key={step.id ?? step.title}
                href={step.href}
                className="snap-center"
                aria-label={`${step.title}`}
              >
                {content}
              </Link>
            );
          }

          return (
            <div key={step.id ?? step.title} className="snap-center" aria-current={state === 'current'}>
              {content}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-2">
        {dots.map((isActive, index) => (
          <span
            key={steps[index]?.id ?? steps[index]?.title ?? index}
            className={`h-2 w-2 rounded-full ${transitionClass} ${
              isActive ? 'bg-uyan-action' : 'bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
