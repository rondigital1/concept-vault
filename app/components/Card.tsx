import type { ReactNode } from 'react';

export function Card({
  children,
  className = ''
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[24px] border border-black/8 shadow-[0_18px_48px_rgba(28,48,64,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}
