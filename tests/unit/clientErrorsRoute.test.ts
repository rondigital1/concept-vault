import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/server/observability/logger';

describe('client errors route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.ERROR_REPORTING_URL;
    delete process.env.TELEMETRY_EXPORTER_URL;
  });

  it('accepts and logs valid route error payloads', async () => {
    process.env.ERROR_REPORTING_URL = 'https://telemetry.example/error';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal('fetch', fetchMock);
    const loggerError = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const { POST } = await import('@/app/api/client-errors/route');

    const response = await POST(
      new Request('http://localhost/api/client-errors', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          boundary: 'segment',
          pathname: '/library/123',
          message: 'Failed to render document page',
          digest: 'digest-123',
          timestamp: '2026-04-16T12:00:00.000Z',
          userAgent: 'Vitest',
        }),
      }),
    );

    expect(response.status).toBe(202);
    expect(response.headers.get('x-request-id')).toBeTruthy();
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(loggerError).toHaveBeenCalledWith(
      'client.route_error',
      expect.objectContaining({
        boundary: 'segment',
        pathname: '/library/123',
        message: 'Failed to render document page',
        digest: 'digest-123',
        timestamp: '2026-04-16T12:00:00.000Z',
        userAgent: 'Vitest',
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://telemetry.example/error',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: expect.any(String),
      }),
    );
    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(requestInit?.body))).toEqual(
      expect.objectContaining({
        boundary: 'segment',
        pathname: '/library/123',
        message: 'Failed to render document page',
        digest: 'digest-123',
        timestamp: '2026-04-16T12:00:00.000Z',
        userAgent: 'Vitest',
        source: 'client-route-error',
        requestId: expect.any(String),
        receivedAt: expect.any(String),
      }),
    );
  });

  it('rejects malformed payloads', async () => {
    const { POST } = await import('@/app/api/client-errors/route');

    const response = await POST(
      new Request('http://localhost/api/client-errors', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          boundary: 'segment',
          pathname: '',
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid request payload',
      details: expect.arrayContaining([
        expect.objectContaining({
          path: 'pathname',
          message: 'pathname is required',
        }),
        expect.objectContaining({
          path: 'message',
          message: 'Required',
        }),
        expect.objectContaining({
          path: 'timestamp',
          message: 'Required',
        }),
      ]),
    });
    const validation = await import('@/server/http/requestValidation');
    expect(validation.getValidationFailureCount('/api/client-errors')).toBe(1);
  });
});
