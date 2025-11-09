import { forwardRef, InputHTMLAttributes } from 'react';

const baseStyles =
  'w-full rounded-xl bg-bg-tertiary/60 px-4 py-3 text-base text-text-primary placeholder:text-text-tertiary/70 focus:outline focus:outline-2 focus:outline-uyan-action transition-all duration-200';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className = '', ...props }, ref) => {
  return <input ref={ref} className={`${baseStyles} ${className}`.trim()} {...props} />;
});

Input.displayName = 'Input';
