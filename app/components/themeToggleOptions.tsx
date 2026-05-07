import type { ReactNode } from 'react';
import type { ThemePreference } from './themePreference';

function MoonIcon() {
  return (
    <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 15.2A8.5 8.5 0 0 1 8.8 4 9 9 0 1 0 20 15.2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5V5.1M12 18.9v2.6M21.5 12h-2.6M5.1 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 24 24" fill="none">
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9 19.5h6M12 16.5v3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  icon: ReactNode;
}> = [
  { value: 'light', label: 'Light', icon: <SunIcon /> },
  { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
  { value: 'system', label: 'System', icon: <SystemIcon /> },
];
