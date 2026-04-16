import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { buildReleaseSmokePlan, runReleaseSmoke } from '@/server/smoke/releaseSmoke';

type TestServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

let activeServer: TestServer | null = null;

async function startServer(
  handler: (request: IncomingMessage, response: ServerResponse<IncomingMessage>) => void,
): Promise<TestServer> {
  const server = createServer(handler);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Expected an IPv4 test server address');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
  };
}

afterEach(async () => {
  if (activeServer) {
    await activeServer.close();
    activeServer = null;
  }
});

describe('release smoke runner', () => {
  it('builds the expected deploy-critical smoke plan', () => {
    const steps = buildReleaseSmokePlan('http://127.0.0.1:3000', 'cron-secret');

    expect(steps.map((step) => step.name)).toEqual([
      'root route requires auth',
      'today route requires auth',
      'library route requires auth',
      'reports route requires auth',
      'ingest route requires auth',
      'pipeline API blocks unauthenticated access',
      'ingest API blocks unauthenticated access',
      'cron API rejects missing bearer secret',
      'cron API accepts configured bearer secret',
    ]);
  });

  it('returns structured results for successful smoke checks', async () => {
    activeServer = await startServer((request, response) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');

      if (request.method === 'GET' && ['/', '/today', '/library', '/reports', '/ingest'].includes(url.pathname)) {
        response.statusCode = 307;
        response.setHeader('location', `/api/auth/signin?callbackUrl=${encodeURIComponent(url.pathname)}`);
        response.end();
        return;
      }

      if (request.method === 'POST' && ['/api/runs/pipeline', '/api/ingest'].includes(url.pathname)) {
        response.statusCode = 401;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/cron/pipeline') {
        const authHeader = request.headers.authorization;
        response.setHeader('content-type', 'application/json');

        if (authHeader === 'Bearer cron-secret') {
          response.statusCode = 200;
          response.end(JSON.stringify({ ok: true, processedTopics: 0 }));
          return;
        }

        response.statusCode = 401;
        response.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      response.statusCode = 404;
      response.end('Not found');
    });

    const seenSteps: string[] = [];
    const result = await runReleaseSmoke({
      baseUrl: activeServer.baseUrl,
      cronSecret: 'cron-secret',
      onStep(step) {
        seenSteps.push(step.name);
      },
    });

    expect(result.ok).toBe(true);
    expect(result.failed).toBe(0);
    expect(result.passed).toBe(9);
    expect(result.results.every((step) => step.durationMs >= 0)).toBe(true);
    expect(seenSteps).toHaveLength(9);
    expect(result.results.at(-1)).toMatchObject({
      name: 'cron API accepts configured bearer secret',
      ok: true,
      status: 200,
    });
  });

  it('surfaces the failing route when a smoke step regresses', async () => {
    activeServer = await startServer((request, response) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');

      if (request.method === 'GET' && ['/', '/today', '/library', '/reports', '/ingest'].includes(url.pathname)) {
        response.statusCode = url.pathname === '/reports' ? 200 : 307;
        if (response.statusCode === 307) {
          response.setHeader('location', `/api/auth/signin?callbackUrl=${encodeURIComponent(url.pathname)}`);
        }
        response.end(response.statusCode === 200 ? 'unexpected success' : '');
        return;
      }

      if (request.method === 'POST' && ['/api/runs/pipeline', '/api/ingest'].includes(url.pathname)) {
        response.statusCode = 401;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/cron/pipeline') {
        response.statusCode = request.headers.authorization === 'Bearer cron-secret' ? 200 : 401;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ ok: response.statusCode === 200, error: response.statusCode === 401 ? 'Unauthorized' : undefined }));
        return;
      }

      response.statusCode = 404;
      response.end('Not found');
    });

    const result = await runReleaseSmoke({
      baseUrl: activeServer.baseUrl,
      cronSecret: 'cron-secret',
    });

    expect(result.ok).toBe(false);
    expect(result.failed).toBe(1);
    expect(result.results.find((step) => !step.ok)).toMatchObject({
      name: 'reports route requires auth',
      path: '/reports',
      status: 200,
    });
  });
});
