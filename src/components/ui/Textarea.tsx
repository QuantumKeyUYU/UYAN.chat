import { forwardRef, TextareaHTMLAttributes } from 'react';

const baseStyles =
  'w-full rounded-xl bg-bg-tertiary/60 px-4 py-3 text-base text-text-primary placeholder:text-text-tertiary/70 focus:outline focus:outline-2 focus:outline-uyan-action transition-all duration-200';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...props }, ref) => {
    return <textarea ref={ref} className={`${baseStyles} ${className}`.trim()} {...props} />;
  },
);

Textarea.displayName = 'Textarea';
