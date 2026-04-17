import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/server/observability/logger';

describe('deprecated route telemetry', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('logs compatibility hits for deprecated pipeline aliases', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const { POST } = await import('@/app/api/distill/route');

    const response = await POST(
      new Request('http://localhost/api/distill', {
        method: 'POST',
        headers: {
          'x-request-id': 'deprecated-req-1',
          'user-agent': 'Vitest',
          referer: 'http://localhost/today',
        },
      }),
    );

    expect(response.status).toBe(410);
    expect(response.headers.get('x-request-id')).toBe('deprecated-req-1');
    await expect(response.json()).resolves.toMatchObject({
      replacement: '/api/runs/pipeline',
      error: 'This endpoint has been removed. Use /api/runs/pipeline for the canonical workflow.',
    });
    expect(warnSpy).toHaveBeenCalledWith(
      'http.deprecated_route.hit',
      expect.objectContaining({
        method: 'POST',
        pathname: '/api/distill',
        replacement: '/api/runs/pipeline',
        referer: 'http://localhost/today',
        userAgent: 'Vitest',
      }),
    );
  });

  it('logs deprecated cron hits against the canonical cron replacement', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const { GET } = await import('@/app/api/cron/web-scout/route');

    const response = await GET(
      new Request('http://localhost/api/cron/web-scout', {
        headers: {
          'x-request-id': 'deprecated-req-2',
        },
      }),
    );

    expect(response.status).toBe(410);
    expect(response.headers.get('x-request-id')).toBe('deprecated-req-2');
    await expect(response.json()).resolves.toMatchObject({
      replacement: '/api/cron/pipeline',
      error: 'This cron endpoint has been removed. Use /api/cron/pipeline for the canonical workflow.',
    });
    expect(warnSpy).toHaveBeenCalledWith(
      'http.deprecated_route.hit',
      expect.objectContaining({
        method: 'GET',
        pathname: '/api/cron/web-scout',
        replacement: '/api/cron/pipeline',
      }),
    );
  });
});
