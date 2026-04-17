import { describe, expect, it } from 'vitest';
import {
  THEME_SCOPE_COPY,
  getRelativeThemePreference,
  getThemePreferenceIndex,
  isThemePreference,
} from '@/app/components/ThemeToggle';

describe('isThemePreference', () => {
  it('accepts the supported theme preferences', () => {
    expect(isThemePreference('light')).toBe(true);
    expect(isThemePreference('dark')).toBe(true);
    expect(isThemePreference('system')).toBe(true);
  });

  it('rejects unsupported values', () => {
    expect(isThemePreference('sepia')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });
});

describe('getThemePreferenceIndex', () => {
  it('keeps the keyboard order aligned with the rendered control', () => {
    expect(getThemePreferenceIndex('light')).toBe(0);
    expect(getThemePreferenceIndex('dark')).toBe(1);
    expect(getThemePreferenceIndex('system')).toBe(2);
  });
});

describe('getRelativeThemePreference', () => {
  it('cycles forward through the radio options', () => {
    expect(getRelativeThemePreference('light', 'next')).toBe('dark');
    expect(getRelativeThemePreference('dark', 'next')).toBe('system');
    expect(getRelativeThemePreference('system', 'next')).toBe('light');
  });

  it('cycles backward through the radio options', () => {
    expect(getRelativeThemePreference('light', 'previous')).toBe('system');
    expect(getRelativeThemePreference('system', 'previous')).toBe('dark');
  });
});

describe('THEME_SCOPE_COPY', () => {
  it('makes the shared-shell scope explicit', () => {
    expect(THEME_SCOPE_COPY).toContain('Shared shell only');
    expect(THEME_SCOPE_COPY).toContain('Immersive workspaces stay dark');
  });
});
