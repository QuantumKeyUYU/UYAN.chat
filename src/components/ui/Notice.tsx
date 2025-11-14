import { ReactNode } from 'react';

interface NoticeProps {
  variant: 'error' | 'success' | 'info' | 'warning';
  children: ReactNode;
  title?: string;
  className?: string;
}

const variantStyles: Record<NoticeProps['variant'], string> = {
  error: 'border-red-500/40 bg-red-500/10 text-red-100',
  success: 'border-uyan-light/50 bg-uyan-light/10 text-uyan-light',
  info: 'border-white/10 bg-bg-secondary/60 text-text-secondary',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
};

export const Notice = ({ variant, children, title, className = '' }: NoticeProps) => {
  return (
    <div
      className={`rounded-2xl border p-4 text-sm shadow-inner shadow-black/10 backdrop-blur ${variantStyles[variant]} ${className}`.trim()}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div className="space-y-1 leading-relaxed">{children}</div>
    </div>
  );
};
