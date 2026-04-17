import { describe, expect, it } from 'vitest';
import { buildClientRouteErrorPayload } from '@/app/components/routeErrorReporting';

describe('buildClientRouteErrorPayload', () => {
  it('normalizes route error telemetry fields', () => {
    const payload = buildClientRouteErrorPayload({
      error: Object.assign(new Error('Route failed to render'), { digest: 'digest-123' }),
      boundary: 'segment',
      pathname: '/reports/123?view=full',
      timestamp: '2026-04-16T12:00:00.000Z',
      userAgent: 'Vitest',
    });

    expect(payload).toEqual({
      boundary: 'segment',
      pathname: '/reports/123?view=full',
      message: 'Route failed to render',
      digest: 'digest-123',
      timestamp: '2026-04-16T12:00:00.000Z',
      userAgent: 'Vitest',
    });
  });

  it('falls back for blank values and truncates oversized fields', () => {
    const payload = buildClientRouteErrorPayload({
      error: Object.assign(new Error(' '.repeat(4)), { digest: 'x'.repeat(140) }),
      boundary: 'global',
      pathname: `/${'route/'.repeat(120)}`,
      userAgent: 'a'.repeat(600),
    });

    expect(payload.pathname.length).toBeLessThanOrEqual(512);
    expect(payload.message).toBe('Unknown route error');
    expect(payload.digest?.length).toBeLessThanOrEqual(120);
    expect(payload.userAgent?.length).toBeLessThanOrEqual(512);
  });
});
