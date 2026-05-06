import type { IngestIconName } from '../types';

export function IngestIcon({
  name,
  className = 'h-5 w-5',
}: {
  name: IngestIconName;
  className?: string;
}) {
  switch (name) {
    case 'terminal':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6.75h16v10.5H4z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m7.5 10 2.5 2-2.5 2M12.5 14H16" />
        </svg>
      );
    case 'brain':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5A3.5 3.5 0 0 0 5.5 8v1A2.5 2.5 0 0 0 3 11.5v1A2.5 2.5 0 0 0 5.5 15H6a3 3 0 0 0 3 3h.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 4.5A3.5 3.5 0 0 1 18.5 8v1a2.5 2.5 0 0 1 2.5 2.5v1A2.5 2.5 0 0 1 18.5 15H18a3 3 0 0 1-3 3h-.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M9.5 8.5c.5.8 1.3 1.2 2.5 1.2s2-.4 2.5-1.2M9.5 15.5c.5-.8 1.3-1.2 2.5-1.2s2 .4 2.5 1.2" />
        </svg>
      );
    case 'database':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <ellipse cx="12" cy="6.5" rx="6.5" ry="2.75" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 6.5v4.5c0 1.52 2.91 2.75 6.5 2.75s6.5-1.23 6.5-2.75V6.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 11v4.5c0 1.52 2.91 2.75 6.5 2.75s6.5-1.23 6.5-2.75V11" />
        </svg>
      );
    case 'network':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <circle cx="6" cy="6" r="2" />
          <circle cx="18" cy="6" r="2" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h8M6 8v8M18 8v8M8 18h8M7.4 7.4l9.2 9.2M16.6 7.4 7.4 16.6" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 3.75h1.5l.56 2.03c.42.12.83.29 1.2.5l1.93-.95 1.06 1.06-.95 1.93c.21.37.38.78.5 1.2l2.03.56v1.5l-2.03.56c-.12.42-.29.83-.5 1.2l.95 1.93-1.06 1.06-1.93-.95c-.37.21-.78.38-1.2.5l-.56 2.03h-1.5l-.56-2.03a7.9 7.9 0 0 1-1.2-.5l-1.93.95-1.06-1.06.95-1.93a7.9 7.9 0 0 1-.5-1.2l-2.03-.56v-1.5l2.03-.56c.12-.42.29-.83.5-1.2l-.95-1.93 1.06-1.06 1.93.95c.37-.21.78-.38 1.2-.5z" />
          <circle cx="12" cy="12" r="2.75" />
        </svg>
      );
    case 'bell':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17.5H9m6 0H6.75c.7-.69 1.25-1.95 1.25-3.25v-2a4 4 0 1 1 8 0v2c0 1.3.55 2.56 1.25 3.25z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.25 17.5a1.75 1.75 0 0 0 3.5 0" />
        </svg>
      );
    case 'file':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h6l3 3v13.5h-9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 3.75v3h3M9 12h6M9 15h6" />
        </svg>
      );
    case 'link':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 14.25 8 16a3 3 0 1 1-4.24-4.24l2.5-2.5A3 3 0 0 1 10.5 13" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.25 9.75 1.75-1.75a3 3 0 0 1 4.24 4.24l-2.5 2.5A3 3 0 0 1 13.5 11" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.75 15.25 6.5-6.5" />
        </svg>
      );
    case 'article':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 4.5h10.5v15h-10.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25h6M9 12h6M9 15.75h4.5" />
        </svg>
      );
    case 'upload':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V7.5M8.75 10.75 12 7.5l3.25 3.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.75 15.5a3.75 3.75 0 0 1 .8-7.42 5.5 5.5 0 0 1 10.65-.42 3.5 3.5 0 1 1 1.05 6.84h-2.5" />
        </svg>
      );
    case 'filter':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7.5h15M7.5 12h9M10.5 16.5h3" />
        </svg>
      );
    case 'search':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <circle cx="11" cy="11" r="5.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m16 16 3.5 3.5" />
        </svg>
      );
    case 'list':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h10M8 12h10M8 17h10" />
          <circle cx="5" cy="7" r=".75" fill="currentColor" />
          <circle cx="5" cy="12" r=".75" fill="currentColor" />
          <circle cx="5" cy="17" r=".75" fill="currentColor" />
        </svg>
      );
    case 'logout':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H7.5v12H10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 8.5 17.5 12 14 15.5M9.5 12h8" />
        </svg>
      );
    case 'check':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 2.75a9.25 9.25 0 1 0 9.25 9.25A9.26 9.26 0 0 0 12 2.75Zm4.08 7.44-4.74 5.41a.75.75 0 0 1-1.08.04l-2.34-2.2a.75.75 0 0 1 1.03-1.09l1.77 1.66 4.23-4.83a.75.75 0 1 1 1.13.99Z" />
        </svg>
      );
    case 'warning':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 3.25c.5 0 .97.27 1.22.72l8.25 14.5a1.4 1.4 0 0 1-1.22 2.03H3.75a1.4 1.4 0 0 1-1.22-2.03l8.25-14.5c.25-.45.72-.72 1.22-.72Zm0 5.25a.9.9 0 0 0-.9.9v4.25a.9.9 0 1 0 1.8 0V9.4a.9.9 0 0 0-.9-.9Zm0 8.3a1.05 1.05 0 1 0 0-2.1 1.05 1.05 0 0 0 0 2.1Z" />
        </svg>
      );
  }
}
