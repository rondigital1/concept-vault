import { describe, expect, it, vi } from 'vitest';
import { DEV_AUTH_FALLBACK_SECRET, resolveAuthSecrets } from '@/server/auth/authSecrets';

describe('resolveAuthSecrets', () => {
  it('returns AUTH_SECRET when only the primary secret is configured', () => {
    expect(
      resolveAuthSecrets({
        NODE_ENV: 'development',
        AUTH_SECRET: 'current-secret',
      }),
    ).toBe('current-secret');
  });

  it('uses NEXTAUTH_SECRET when AUTH_SECRET is absent', () => {
    expect(
      resolveAuthSecrets({
        NODE_ENV: 'development',
        NEXTAUTH_SECRET: 'alias-secret',
      }),
    ).toBe('alias-secret');
  });

  it('returns the current secret followed by rotated fallback secrets', () => {
    expect(
      resolveAuthSecrets({
        NODE_ENV: 'production',
        AUTH_SECRET: 'current-secret',
        AUTH_SECRET_1: 'previous-secret',
        AUTH_SECRET_2: 'oldest-secret',
      }),
    ).toEqual(['current-secret', 'previous-secret', 'oldest-secret']);
  });

  it('deduplicates identical rotated secrets', () => {
    expect(
      resolveAuthSecrets({
        NODE_ENV: 'production',
        AUTH_SECRET: 'current-secret',
        AUTH_SECRET_1: 'current-secret',
        AUTH_SECRET_2: 'previous-secret',
      }),
    ).toEqual(['current-secret', 'previous-secret']);
  });

  it('throws when AUTH_SECRET and NEXTAUTH_SECRET disagree', () => {
    expect(() =>
      resolveAuthSecrets({
        NODE_ENV: 'production',
        AUTH_SECRET: 'current-secret',
        NEXTAUTH_SECRET: 'different-secret',
      }),
    ).toThrow(/AUTH_SECRET and NEXTAUTH_SECRET are both set but do not match/i);
  });

  it('throws when rotated secrets are configured without a current secret', () => {
    expect(() =>
      resolveAuthSecrets({
        NODE_ENV: 'production',
        AUTH_SECRET_1: 'previous-secret',
      }),
    ).toThrow(/AUTH_SECRET is required when using rotated auth secrets/i);
  });

  it('falls back to the stable development secret when no secrets are configured', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(
      resolveAuthSecrets({
        NODE_ENV: 'development',
      }),
    ).toBe(DEV_AUTH_FALLBACK_SECRET);

    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('throws in production when no secrets are configured', () => {
    expect(() =>
      resolveAuthSecrets({
        NODE_ENV: 'production',
      }),
    ).toThrow(/AUTH_SECRET is required in production/i);
  });
});
