import type { ReactNode } from 'react';

export function Card({
  children,
  className = ''
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border shadow-[0_16px_50px_rgba(0,0,0,0.32)] ${className}`}>
      {children}
    </div>
  );
}
