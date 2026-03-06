'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

type ThemePreference = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';

const STORAGE_KEY = 'concept-vault-theme';

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

const OPTIONS: Array<{ value: ThemePreference; label: string; icon: ReactNode }> = [
  { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
  { value: 'light', label: 'Light', icon: <SunIcon /> },
  { value: 'system', label: 'System', icon: <SystemIcon /> },
];

function isThemePreference(value: string | null | undefined): value is ThemePreference {
  return value === 'dark' || value === 'light' || value === 'system';
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ThemePreference): ResolvedTheme {
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
  const root = document.documentElement;

  root.dataset.theme = theme;
  root.dataset.resolvedTheme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;

  return resolvedTheme;
}

function getStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const rootTheme = document.documentElement.dataset.theme;
  if (isThemePreference(rootTheme)) {
    return rootTheme;
  }

  const storedTheme = window.localStorage.getItem(STORAGE_KEY);
  return isThemePreference(storedTheme) ? storedTheme : 'system';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>('system');
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const storedTheme = getStoredTheme();
    setTheme(storedTheme);
    applyTheme(storedTheme);
    window.localStorage.setItem(STORAGE_KEY, storedTheme);
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', syncSystemTheme);

    return () => {
      mediaQuery.removeEventListener('change', syncSystemTheme);
    };
  }, [hasHydrated, theme]);

  return (
    <div className="flex justify-center sm:justify-end">
      <div
        aria-label="Theme selector"
        className="inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1"
        role="tablist"
      >
        {OPTIONS.map((option) => {
          const isActive = option.value === theme;

          return (
            <button
              key={option.value}
              aria-pressed={isActive}
              className={[
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-white/10 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100',
              ].join(' ')}
              onClick={() => setTheme(option.value)}
              type="button"
            >
              {option.icon}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
