export type ThemePreference = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';
export type ThemeDirection = 'next' | 'previous';

export const STORAGE_KEY = 'concept-vault-theme';
export const THEME_ORDER: ThemePreference[] = ['light', 'dark', 'system'];
export const THEME_SCOPE_COPY = 'Shared shell only. Immersive workspaces stay dark.';

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
