type AskVaultIconName =
  | 'agents'
  | 'brand'
  | 'chat'
  | 'close'
  | 'delete'
  | 'help'
  | 'ingest'
  | 'library'
  | 'menu'
  | 'paperclip'
  | 'plus'
  | 'reports'
  | 'research'
  | 'robot'
  | 'send'
  | 'timeline';

type Props = {
  name: AskVaultIconName;
  className?: string;
  filled?: boolean;
};

export function AskVaultIcon({ name, className = 'h-4 w-4', filled = false }: Props) {
  switch (name) {
    case 'agents':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 8.25h8M8 12h8m-8 3.75h5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.25 4.75h9.5A2.5 2.5 0 0 1 19.25 7.25v9.5a2.5 2.5 0 0 1-2.5 2.5h-9.5a2.5 2.5 0 0 1-2.5-2.5v-9.5a2.5 2.5 0 0 1 2.5-2.5Z" />
        </svg>
      );
    case 'brand':
      return (
        <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <circle cx="12" cy="5.5" r="1.8" />
          <circle cx="17.5" cy="9" r="1.8" />
          <circle cx="17.5" cy="15" r="1.8" />
          <circle cx="12" cy="18.5" r="1.8" />
          <circle cx="6.5" cy="15" r="1.8" />
          <circle cx="6.5" cy="9" r="1.8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.9 6.85 7.65 8.75m8.7 0-3.25-1.9m0 10.3 3.25-1.9m-8.7 0 3.25 1.9M8.3 10.65v2.7m7.4-2.7v2.7" />
        </svg>
      );
    case 'chat':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10.5h8M8 14h5m-7.25 6.25v-2.68A8.5 8.5 0 1 1 20.5 12c0 4.31-3.2 7.88-7.35 8.44l-7.4-.19Z" />
        </svg>
      );
    case 'close':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case 'delete':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
        </svg>
      );
    case 'help':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.25a2.75 2.75 0 1 1 4.28 2.29c-.88.59-1.53 1.13-1.53 2.21" />
          <circle cx="12" cy="17.2" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'ingest':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v10.5m0 0 4-4m-4 4-4-4M5.75 17.75h12.5" />
        </svg>
      );
    case 'library':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 8A2.25 2.25 0 0 1 6 5.75h4.25l1.5 1.75H18A2.25 2.25 0 0 1 20.25 9.75v7.5A2.25 2.25 0 0 1 18 19.5H6a2.25 2.25 0 0 1-2.25-2.25V8Z" />
        </svg>
      );
    case 'menu':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case 'paperclip':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 12.5 5.44-5.44a3.25 3.25 0 1 1 4.6 4.6l-7.13 7.13a5 5 0 1 1-7.07-7.07l7.43-7.43" />
        </svg>
      );
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'reports':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 5.75h10.5A1.75 1.75 0 0 1 19 7.5v9A1.75 1.75 0 0 1 17.25 18.25H6.75A1.75 1.75 0 0 1 5 16.5v-9a1.75 1.75 0 0 1 1.75-1.75Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 14.5 11 12l2 1.75 3-3.25" />
        </svg>
      );
    case 'research':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 1.45 4.55L18 9l-4.55 1.45L12 15l-1.45-4.55L6 9l4.55-1.45L12 3Zm6 11 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3ZM5 13l.75 2.25L8 16l-2.25.75L5 19l-.75-2.25L2 16l2.25-.75L5 13Z" />
        </svg>
      );
    case 'robot':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5v3m-4.75 0h9.5A2.75 2.75 0 0 1 19.5 9.25v4.5a2.75 2.75 0 0 1-2.75 2.75h-9.5A2.75 2.75 0 0 1 4.5 13.75v-4.5A2.75 2.75 0 0 1 7.25 6.5ZM8.75 12h.01m6.49 0h.01M8.5 16.5v2m7-2v2" />
        </svg>
      );
    case 'send':
      return (
        <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0-14-5.25 5.25M12 5l5.25 5.25" />
        </svg>
      );
    case 'timeline':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 6.5h10M7 12h10M7 17.5h10" />
          <circle cx="5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="5" cy="12" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="5" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
