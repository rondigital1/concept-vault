import {
  STORAGE_KEY,
  isThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from './themePreference';

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: ThemePreference): ResolvedTheme {
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
  const root = document.documentElement;

  root.dataset.theme = theme;
  root.dataset.resolvedTheme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;

  return resolvedTheme;
}

export function persistTheme(theme: ThemePreference) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore persistence failures and keep the in-memory theme selection.
  }
}

export function getStoredTheme(): ThemePreference {
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
