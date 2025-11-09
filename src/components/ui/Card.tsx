import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card = ({ children, className = '' }: CardProps) => {
  return (
    <div
      className={`rounded-xl bg-bg-secondary/80 p-6 shadow-lg shadow-black/20 backdrop-blur-sm transition-transform duration-200 hover:scale-[1.01] ${className}`.trim()}
    >
      {children}
    </div>
  );
};
