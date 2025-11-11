'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { StepDefinition } from './types';
import { useSettingsStore } from '@/store/settings';

interface StepperDesktopProps {
  steps: StepDefinition[];
  activeIndex: number;
  progress: number;
}

export const StepperDesktop = ({ steps, activeIndex, progress }: StepperDesktopProps) => {
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const progressWidth = `${Math.max(0, Math.min(1, progress)) * 100}%`;
  const transitionClass = useMemo(() => (reducedMotion ? 'transition-none' : 'transition-all'), [reducedMotion]);

  return (
    <div className="hidden w-full flex-col gap-4 sm:flex">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full bg-uyan-action ${transitionClass}`} style={{ width: progressWidth }} />
      </div>
      <ol className="grid gap-3 sm:grid-cols-4">
        {steps.map((step, index) => {
          const state = index < activeIndex ? 'done' : index === activeIndex ? 'current' : 'upcoming';
          const isInteractive = Boolean(step.href) && state !== 'current';

          const content = (
            <div
              className={`flex h-full flex-col gap-2 rounded-2xl border p-4 text-left ${transitionClass} ${
                state === 'done'
                  ? 'border-uyan-light/40 bg-uyan-darkness/10 text-text-primary'
                  : state === 'current'
                  ? 'border-uyan-action/60 bg-uyan-action/10 text-text-primary shadow-glow'
                  : 'border-white/10 bg-bg-secondary/60 text-text-secondary'
              }`}
            >
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-text-tertiary">
                <span>Этап {index + 1}</span>
                <span>{state === 'done' ? 'пройдено' : state === 'current' ? 'сейчас' : 'дальше'}</span>
              </div>
              <p className="text-base font-semibold text-text-primary">{step.title}</p>
              {step.description ? (
                <p className="text-sm leading-relaxed text-text-secondary">{step.description}</p>
              ) : null}
            </div>
          );

          if (isInteractive) {
            return (
              <li key={step.id ?? step.title} className="h-full">
                <Link
                  href={step.href ?? '#'}
                  className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-action"
                >
                  {content}
                </Link>
              </li>
            );
          }

          return (
            <li key={step.id ?? step.title} className="h-full">
              <div aria-current={state === 'current'}>{content}</div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
