'use client';

import { StepperDesktop } from './StepperDesktop';
import { StepperMobile } from './StepperMobile';
import type { StepDefinition } from './types';

interface StepperProps {
  steps: StepDefinition[];
  activeIndex: number;
}

export const Stepper = ({ steps, activeIndex }: StepperProps) => {
  const total = steps.length;
  const clampedIndex = Math.min(Math.max(activeIndex, 0), Math.max(0, total - 1));
  const progress = total <= 1 ? 1 : (clampedIndex + 1) / total;

  return (
    <div className="w-full">
      <StepperMobile steps={steps} activeIndex={clampedIndex} progress={progress} />
      <StepperDesktop steps={steps} activeIndex={clampedIndex} progress={progress} />
    </div>
  );
};

export type { StepDefinition };
export { StepperDesktop, StepperMobile };
