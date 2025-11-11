'use client';

import Link from 'next/link';

interface Step {
  title: string;
  description?: string;
  href?: string;
}

interface StepperProps {
  steps: ReadonlyArray<Step>;
  current: number;
}

const mergeClasses = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="grid gap-3 sm:grid-cols-4">
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'upcoming';
        const isInteractive = Boolean(step.href) && state !== 'current';
        const content = (
          <div
            className={mergeClasses(
              'flex flex-col gap-2 rounded-2xl border p-4 transition-colors',
              state === 'done' && 'border-uyan-light/40 bg-uyan-darkness/20 text-text-primary',
              state === 'current' && 'border-uyan-action/60 bg-uyan-action/10 text-text-primary shadow-glow',
              state === 'upcoming' && 'border-white/10 bg-bg-secondary/50 text-text-secondary',
            )}
          >
            <div className="flex items-center justify-between text-sm uppercase tracking-[0.25em]">
              <span className="text-xs text-uyan-light">Шаг {index + 1}</span>
              <span className="text-xs text-text-tertiary">
                {state === 'done' ? 'готово' : state === 'current' ? 'сейчас' : 'дальше'}
              </span>
            </div>
            <p className="text-base font-semibold text-text-primary">{step.title}</p>
            {step.description ? <p className="text-sm text-text-secondary">{step.description}</p> : null}
          </div>
        );

        if (isInteractive) {
          return (
            <li key={step.title}>
              <Link href={step.href ?? '#'} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-uyan-action">
                {content}
              </Link>
            </li>
          );
        }

        return <li key={step.title}>{content}</li>;
      })}
    </ol>
  );
}
