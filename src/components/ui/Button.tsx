'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

const baseStyles =
  'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none';

const variantStyles: Record<string, string> = {
  primary: 'bg-uyan-action text-bg-primary hover:scale-[1.02] hover:bg-uyan-light focus-visible:outline-uyan-action shadow-lg shadow-uyan-action/20',
  secondary:
    'border border-text-tertiary/40 text-text-primary hover:scale-[1.02] hover:border-uyan-light hover:text-uyan-light focus-visible:outline-uyan-light',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary/60',
};

const sizeStyles: Record<string, string> = {
  md: 'px-5 py-3 text-sm sm:text-base',
  lg: 'px-6 py-3.5 text-base sm:text-lg',
  sm: 'px-3 py-2 text-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`.trim()}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
