import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSql = vi.hoisted(() => vi.fn());
const mockGetSchemaStatus = vi.hoisted(() => vi.fn());

vi.mock('@/db', () => ({
  sql: mockSql,
  getSchemaStatus: mockGetSchemaStatus,
}));

describe('health routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    delete process.env.TELEMETRY_EXPORTER_URL;
    delete process.env.ERROR_REPORTING_URL;
  });

  it('returns liveness status and request id for /api/health', async () => {
    const { GET } = await import('@/app/api/health/route');

    const response = await GET(
      new Request('http://localhost/api/health', {
        headers: {
          'x-request-id': 'health-req-1',
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('health-req-1');
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      service: 'concept-vault',
      telemetry: {
        telemetryExporterEnabled: false,
        errorReportingEnabled: false,
      },
    });
  });

  it('returns readiness success when database and schema are healthy', async () => {
    mockSql.mockResolvedValue([{ '?column?': 1 }]);
    mockGetSchemaStatus.mockResolvedValue({
      ok: true,
      currentVersion: '0004',
      expectedVersion: '0004',
      pendingVersions: [],
      driftReasons: [],
    });

    const { GET } = await import('@/app/api/health/ready/route');
    const response = await GET(
      new Request('http://localhost/api/health/ready', {
        headers: {
          'x-request-id': 'ready-req-1',
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('ready-req-1');
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      database: 'ok',
      schema: expect.objectContaining({
        ok: true,
        expectedVersion: '0004',
      }),
    });
  });

  it('returns readiness failure when schema is not ready', async () => {
    mockSql.mockResolvedValue([{ '?column?': 1 }]);
    mockGetSchemaStatus.mockResolvedValue({
      ok: false,
      currentVersion: '0003',
      expectedVersion: '0004',
      pendingVersions: ['0004'],
      driftReasons: [],
      error: 'Database schema is not up to date.',
    });

    const { GET } = await import('@/app/api/health/ready/route');
    const response = await GET(new Request('http://localhost/api/health/ready'));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      database: 'ok',
      schema: expect.objectContaining({
        ok: false,
        pendingVersions: ['0004'],
      }),
    });
  });
});
