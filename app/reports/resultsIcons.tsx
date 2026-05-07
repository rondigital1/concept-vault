export type ResultsIconName =
  | 'analytics'
  | 'archive'
  | 'arrow-left'
  | 'arrow-up-right'
  | 'bell'
  | 'chat'
  | 'check'
  | 'close'
  | 'external'
  | 'library'
  | 'plus'
  | 'report'
  | 'research'
  | 'settings'
  | 'stack';

export function ResultsIcon({
  name,
  className = 'h-[1.15rem] w-[1.15rem]',
}: {
  name: ResultsIconName;
  className?: string;
}) {
  switch (name) {
    case 'analytics':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 18.75h13.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 16.5V9.75M12 16.5V6.75M16.5 16.5v-3.75" />
        </svg>
      );
    case 'archive':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7.5h15v10.5A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V7.5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5h16.5v3H3.75zM9.75 12h4.5" />
        </svg>
      );
    case 'arrow-left':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75 9.75 12l6 5.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 12h10.5" />
        </svg>
      );
    case 'arrow-up-right':
    case 'external':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15.75 15.75 8.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25h6.75V15" />
        </svg>
      );
    case 'bell':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18.75a3 3 0 0 1-6 0" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 16.5H6.75c.6-.65 1.05-1.86 1.05-3.5V10.5a4.2 4.2 0 1 1 8.4 0V13c0 1.64.45 2.85 1.05 3.5Z" />
        </svg>
      );
    case 'chat':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 17.25H4.88A1.88 1.88 0 0 1 3 15.38V6.88C3 5.84 3.84 5 4.88 5h14.24C20.16 5 21 5.84 21 6.88v8.5c0 1.04-.84 1.87-1.88 1.87H11.5L7.5 21v-3.75Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10.25h8M8 13.5h5.5" />
        </svg>
      );
    case 'check':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m5.25 12.75 4.5 4.5L18.75 6.75" />
        </svg>
      );
    case 'close':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 6.75 10.5 10.5M17.25 6.75 6.75 17.25" />
        </svg>
      );
    case 'library':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h10.5A2.25 2.25 0 0 1 19.5 6.75v10.5A2.25 2.25 0 0 1 17.25 19.5H6.75A2.25 2.25 0 0 1 4.5 17.25V6.75Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 8.25h3.75v7.5H8.25zM15.75 8.25v7.5" />
        </svg>
      );
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5.25v13.5M5.25 12h13.5" />
        </svg>
      );
    case 'report':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h7.13l3.62 3.62v12.88H7.5a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3.75v4.5h4.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 12h6M9.75 15.75h6" />
        </svg>
      );
    case 'research':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <circle cx="10.25" cy="10.25" r="5.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.5 14.5 4.75 4.75" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.33 4.69a1.75 1.75 0 0 1 3.34 0l.2.76a1.75 1.75 0 0 0 2.52 1.07l.68-.39a1.75 1.75 0 0 1 2.37.64l.82 1.42a1.75 1.75 0 0 1-.63 2.37l-.67.39a1.75 1.75 0 0 0 0 3.04l.67.39a1.75 1.75 0 0 1 .63 2.37l-.82 1.42a1.75 1.75 0 0 1-2.37.64l-.68-.39a1.75 1.75 0 0 0-2.52 1.07l-.2.76a1.75 1.75 0 0 1-3.34 0l-.2-.76a1.75 1.75 0 0 0-2.52-1.07l-.68.39a1.75 1.75 0 0 1-2.37-.64l-.82-1.42a1.75 1.75 0 0 1 .63-2.37l.67-.39a1.75 1.75 0 0 0 0-3.04l-.67-.39a1.75 1.75 0 0 1-.63-2.37l.82-1.42a1.75 1.75 0 0 1 2.37-.64l.68.39a1.75 1.75 0 0 0 2.52-1.07l.2-.76Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'stack':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m12 5.25 8.25 4.5L12 14.25 3.75 9.75 12 5.25Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 12.75 8.25 4.5 8.25-4.5" />
        </svg>
      );
  }
}
