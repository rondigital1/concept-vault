'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

export type ThemePreference = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';
type ThemeDirection = 'next' | 'previous';

const STORAGE_KEY = 'concept-vault-theme';
const THEME_ORDER: ThemePreference[] = ['light', 'dark', 'system'];

export const THEME_SCOPE_COPY = 'Shared shell only. Immersive workspaces stay dark.';

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
  { value: 'light', label: 'Light', icon: <SunIcon /> },
  { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
  { value: 'system', label: 'System', icon: <SystemIcon /> },
];

export function isThemePreference(value: string | null | undefined): value is ThemePreference {
  return value === 'dark' || value === 'light' || value === 'system';
}

export function getThemePreferenceIndex(theme: ThemePreference): number {
  return THEME_ORDER.indexOf(theme);
}

export function getRelativeThemePreference(
  theme: ThemePreference,
  direction: ThemeDirection,
): ThemePreference {
  const currentIndex = getThemePreferenceIndex(theme);
  const offset = direction === 'next' ? 1 : -1;
  return THEME_ORDER[(currentIndex + offset + THEME_ORDER.length) % THEME_ORDER.length];
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

function persistTheme(theme: ThemePreference) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore persistence failures and keep the in-memory theme selection.
  }
}

function getStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const rootTheme = document.documentElement.dataset.theme;
  if (isThemePreference(rootTheme)) {
    return rootTheme;
  }

  try {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    return isThemePreference(storedTheme) ? storedTheme : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeToggle() {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const groupLabelId = useId();
  const groupDescriptionId = useId();
  const [theme, setTheme] = useState<ThemePreference>('system');
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const storedTheme = getStoredTheme();
    setTheme(storedTheme);
    applyTheme(storedTheme);
    persistTheme(storedTheme);
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    applyTheme(theme);
    persistTheme(theme);

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

  const moveSelection = (nextTheme: ThemePreference) => {
    setTheme(nextTheme);
    buttonRefs.current[getThemePreferenceIndex(nextTheme)]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, optionTheme: ThemePreference) => {
    let nextTheme: ThemePreference | null = null;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextTheme = getRelativeThemePreference(optionTheme, 'next');
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextTheme = getRelativeThemePreference(optionTheme, 'previous');
        break;
      case 'Home':
        nextTheme = THEME_ORDER[0];
        break;
      case 'End':
        nextTheme = THEME_ORDER[THEME_ORDER.length - 1];
        break;
      default:
        return;
    }

    event.preventDefault();
    moveSelection(nextTheme);
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="space-y-1 text-left sm:text-right">
        <p
          id={groupLabelId}
          className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--surface-text-muted)]"
        >
          Workbench Theme
        </p>
        <p id={groupDescriptionId} className="text-xs text-[color:var(--surface-text-muted)]">
          {THEME_SCOPE_COPY}
        </p>
      </div>
      <div
        aria-describedby={groupDescriptionId}
        aria-labelledby={groupLabelId}
        className="inline-flex items-center rounded-full border border-[color:var(--shell-default-outline)] bg-[color:var(--surface-panel)] p-1 shadow-[var(--shell-default-shadow-soft)]"
        role="radiogroup"
      >
        {OPTIONS.map((option, index) => {
          const isActive = option.value === theme;

          return (
            <button
              key={option.value}
              ref={(element) => {
                buttonRefs.current[index] = element;
              }}
              aria-checked={isActive}
              className={[
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-[background-color,color,box-shadow]',
                isActive
                  ? 'bg-[color:var(--surface-accent-ink)] text-white shadow-[0_8px_20px_rgba(16,35,44,0.18)]'
                  : 'text-[color:var(--surface-text-muted)] hover:bg-[color:var(--surface-panel-elevated)] hover:text-[color:var(--surface-text)]',
              ].join(' ')}
              onClick={() => setTheme(option.value)}
              onKeyDown={(event) => handleKeyDown(event, option.value)}
              role="radio"
              tabIndex={isActive ? 0 : -1}
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
