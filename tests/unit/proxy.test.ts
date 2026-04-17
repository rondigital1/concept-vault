import { describe, expect, it, vi } from 'vitest';
import { resetRateLimitState } from '@/server/security/rateLimit';

vi.mock('@/auth', () => ({
  auth: (handler: unknown) => handler,
}));

describe('proxy path helpers', () => {
  it('rate limits high-cost owner API requests after the configured threshold', async () => {
    resetRateLimitState();
    const proxy = (await import('@/proxy')).default;

    const request = {
      method: 'POST',
      nextUrl: new URL('http://localhost/api/runs/pipeline'),
      headers: new Headers({
        'x-forwarded-for': '203.0.113.10',
      }),
      auth: {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          membershipRole: 'owner',
        },
      },
    };

    for (let count = 0; count < 8; count += 1) {
      const response = proxy(request as never);
      expect(response.status).toBe(200);
    }

    const blocked = proxy(request as never);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
  });

  it('treats client telemetry as a same-origin exception instead of a public asset', async () => {
    const { isClientTelemetryPath, isPublicPath } = await import('@/proxy');

    expect(isClientTelemetryPath('/api/client-errors')).toBe(true);
    expect(isPublicPath('/api/client-errors')).toBe(false);
    expect(isPublicPath('/api/health')).toBe(true);
    expect(isPublicPath('/api/health/ready')).toBe(true);
    expect(isPublicPath('/api/auth/signin')).toBe(true);
    expect(isPublicPath('/api/reports')).toBe(false);
  });
});
