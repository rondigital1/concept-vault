type LibraryIconName =
  | 'arrow-up-right'
  | 'chat'
  | 'chevron-right'
  | 'close'
  | 'file'
  | 'folder'
  | 'grid'
  | 'ingest'
  | 'link'
  | 'panel-close'
  | 'panel-open'
  | 'pdf'
  | 'plus'
  | 'report'
  | 'search'
  | 'settings'
  | 'spark'
  | 'star'
  | 'warning';

type Props = {
  name: LibraryIconName;
  className?: string;
  filled?: boolean;
};

export function LibraryIcon({ name, className = 'h-4 w-4', filled = false }: Props) {
  switch (name) {
    case 'arrow-up-right':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M9 7h8v8" />
        </svg>
      );
    case 'chat':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10.5h8M8 14h5m-7.25 6.25v-2.68A8.5 8.5 0 1 1 20.5 12c0 4.31-3.2 7.88-7.35 8.44l-7.4-.19Z" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
        </svg>
      );
    case 'close':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case 'file':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.75h6l4 4v12.5H7A2.25 2.25 0 0 1 4.75 18V6A2.25 2.25 0 0 1 7 3.75Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 3.75V8h4.25" />
        </svg>
      );
    case 'folder':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 8A2.25 2.25 0 0 1 6 5.75h4.25l1.5 1.75H18A2.25 2.25 0 0 1 20.25 9.75v7.5A2.25 2.25 0 0 1 18 19.5H6a2.25 2.25 0 0 1-2.25-2.25V8Z" />
        </svg>
      );
    case 'grid':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <rect x="4.75" y="4.75" width="5.5" height="5.5" rx="1.2" />
          <rect x="13.75" y="4.75" width="5.5" height="5.5" rx="1.2" />
          <rect x="4.75" y="13.75" width="5.5" height="5.5" rx="1.2" />
          <rect x="13.75" y="13.75" width="5.5" height="5.5" rx="1.2" />
        </svg>
      );
    case 'ingest':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v10.5m0 0 4-4m-4 4-4-4M5.75 17.75h12.5" />
        </svg>
      );
    case 'link':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 13.5 8 16a3.5 3.5 0 1 1-5-5l2.75-2.75a3.5 3.5 0 0 1 5 0M13.5 10.5 16 8a3.5 3.5 0 1 1 5 5l-2.75 2.75a3.5 3.5 0 0 1-5 0M8.75 15.25l6.5-6.5" />
        </svg>
      );
    case 'panel-close':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7M4.75 5.5v13" />
        </svg>
      );
    case 'panel-open':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.75 5.5v13m10.5-13-7 7 7 7" />
        </svg>
      );
    case 'pdf':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.75h6l4 4v12.5H7A2.25 2.25 0 0 1 4.75 18V6A2.25 2.25 0 0 1 7 3.75Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15.5h1.5a1.5 1.5 0 0 0 0-3h-1.5v4.5m5.25-4.5h-1.5v4.5h1.5c1.24 0 2.25-1 2.25-2.25s-1-2.25-2.25-2.25Zm3.75 0h2.5m-2.5 2.25H19" />
        </svg>
      );
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'report':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 5.75h10.5A1.75 1.75 0 0 1 19 7.5v9A1.75 1.75 0 0 1 17.25 18.25H6.75A1.75 1.75 0 0 1 5 16.5v-9a1.75 1.75 0 0 1 1.75-1.75Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.75 13.75h2.5v2h-2.5Zm4 0h2.5v2h-2.5Zm-4-4h6.5" />
        </svg>
      );
    case 'search':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <circle cx="11" cy="11" r="5.75" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m16 16 4.25 4.25" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 4.5h3l.72 2.29 2.2.92 2.08-1.18 2.12 2.12-1.18 2.08.92 2.2L22.5 13.5v3l-2.29.72-.92 2.2 1.18 2.08-2.12 2.12-2.08-1.18-2.2.92L13.5 22.5h-3l-.72-2.29-2.2-.92-2.08 1.18-2.12-2.12 1.18-2.08-.92-2.2L1.5 16.5v-3l2.29-.72.92-2.2-1.18-2.08 2.12-2.12 2.08 1.18 2.2-.92L10.5 4.5Z" />
          <circle cx="12" cy="12" r="3.2" />
        </svg>
      );
    case 'spark':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 1.45 4.55L18 9l-4.55 1.45L12 15l-1.45-4.55L6 9l4.55-1.45L12 3Zm6 11 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3ZM5 13l.75 2.25L8 16l-2.25.75L5 19l-.75-2.25L2 16l2.25-.75L5 13Z" />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 24 24" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m12 3.75 2.57 5.2 5.73.83-4.15 4.05.98 5.72L12 16.95l-5.13 2.6.98-5.72-4.15-4.05 5.73-.83L12 3.75Z" />
        </svg>
      );
    case 'warning':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5 20 18.5H4L12 4.5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v4.5m0 3h.01" />
        </svg>
      );
  }
}
