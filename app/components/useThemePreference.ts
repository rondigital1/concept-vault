'use client';

import { useEffect, useState } from 'react';
import { applyTheme, getStoredTheme, persistTheme } from './themeStorage';
import type { ThemePreference } from './themePreference';

export function useThemePreference() {
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

  return {
    theme,
    setTheme,
  };
}
