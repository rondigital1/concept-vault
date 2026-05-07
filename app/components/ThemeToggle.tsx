'use client';

import type { KeyboardEvent } from 'react';
import { useId, useRef } from 'react';
import {
  THEME_ORDER,
  THEME_SCOPE_COPY,
  getRelativeThemePreference,
  getThemePreferenceIndex,
  isThemePreference,
  type ThemePreference,
} from './themePreference';
import { THEME_OPTIONS } from './themeToggleOptions';
import { useThemePreference } from './useThemePreference';

export {
  THEME_SCOPE_COPY,
  getRelativeThemePreference,
  getThemePreferenceIndex,
  isThemePreference,
};
export type { ThemePreference };

export function ThemeToggle() {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const groupLabelId = useId();
  const groupDescriptionId = useId();
  const { theme, setTheme } = useThemePreference();

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
        {THEME_OPTIONS.map((option, index) => {
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
