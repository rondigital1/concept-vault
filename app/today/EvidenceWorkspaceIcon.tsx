'use client';

export type WorkspaceIconName = 'sparkles' | 'search' | 'report' | 'bell' | 'plus';

export function WorkspaceIcon({
  name,
  className = 'h-5 w-5',
}: {
  name: WorkspaceIconName;
  className?: string;
}) {
  if (name === 'sparkles') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M12.8 3.5a.75.75 0 0 1 .73.58l.74 3.3a2.5 2.5 0 0 0 1.88 1.88l3.3.74a.75.75 0 0 1 0 1.46l-3.3.74a2.5 2.5 0 0 0-1.88 1.88l-.74 3.3a.75.75 0 0 1-1.46 0l-.74-3.3a2.5 2.5 0 0 0-1.88-1.88l-3.3-.74a.75.75 0 0 1 0-1.46l3.3-.74a2.5 2.5 0 0 0 1.88-1.88l.74-3.3a.75.75 0 0 1 .73-.58Z" />
      </svg>
    );
  }

  if (name === 'search') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    );
  }

  if (name === 'report') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 3.75h7l4 4V20.25a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.75a1 1 0 0 1 1-1Z" />
        <path d="M14 3.75v4h4" />
        <path d="M9 12h6" />
        <path d="M9 16h4" />
      </svg>
    );
  }

  if (name === 'bell') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 18H6.5a1.5 1.5 0 0 1-1.32-2.22L6 14.25V10a6 6 0 1 1 12 0v4.25l.82 1.53A1.5 1.5 0 0 1 17.5 18H15Z" />
        <path d="M9.75 20a2.25 2.25 0 0 0 4.5 0" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
