type SmokeExpectationResult = {
  ok: boolean;
  detail: string;
};

type SmokeStepDefinition = {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  headers?: Record<string, string>;
  body?: string;
  expected: string;
  validate: (response: Response, bodyText: string) => SmokeExpectationResult;
};

export type ReleaseSmokeStepResult = {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  url: string;
  ok: boolean;
  status: number;
  durationMs: number;
  expected: string;
  detail: string;
  location: string | null;
  bodyPreview: string;
};

export type ReleaseSmokeRunResult = {
  ok: boolean;
  baseUrl: string;
  passed: number;
  failed: number;
  results: ReleaseSmokeStepResult[];
};

export type ReleaseSmokeOptions = {
  baseUrl: string;
  cronSecret?: string;
  onStep?: (result: ReleaseSmokeStepResult) => void;
};

function isRedirectToSignIn(response: Response): boolean {
  const location = response.headers.get('location');
  return response.status >= 300 && response.status < 400 && Boolean(location?.includes('/api/auth/signin'));
}

function previewBody(bodyText: string): string {
  return bodyText.replace(/\s+/g, ' ').trim().slice(0, 200);
}

function expectAuthRedirect(response: Response): SmokeExpectationResult {
  const location = response.headers.get('location');

  if (isRedirectToSignIn(response)) {
    return { ok: true, detail: `redirected to ${location}` };
  }

  return {
    ok: false,
    detail: `expected auth redirect to /api/auth/signin, received status ${response.status}${location ? ` (${location})` : ''}`,
  };
}

function expectUnauthorizedJson(response: Response, bodyText: string): SmokeExpectationResult {
  if (response.status === 401 && bodyText.includes('Unauthorized')) {
    return { ok: true, detail: 'received 401 Unauthorized JSON response' };
  }

  return {
    ok: false,
    detail: `expected 401 Unauthorized JSON response, received status ${response.status} with body "${previewBody(bodyText)}"`,
  };
}

function expectAuthorizedCronSuccess(response: Response, bodyText: string): SmokeExpectationResult {
  if (response.status !== 200) {
    return {
      ok: false,
      detail: `expected 200 JSON response, received status ${response.status} with body "${previewBody(bodyText)}"`,
    };
  }

  try {
    const parsed = JSON.parse(bodyText) as { ok?: unknown };
    if (parsed.ok === true) {
      return { ok: true, detail: 'received 200 JSON response with ok=true' };
    }

    return {
      ok: false,
      detail: `expected ok=true in cron response, received body "${previewBody(bodyText)}"`,
    };
  } catch {
    return {
      ok: false,
      detail: `expected JSON response body, received "${previewBody(bodyText)}"`,
    };
  }
}

export function buildReleaseSmokePlan(baseUrl: string, cronSecret?: string): SmokeStepDefinition[] {
  void baseUrl;
  const cronHeaders = cronSecret
    ? { authorization: `Bearer ${cronSecret}` }
    : undefined;

  const steps: SmokeStepDefinition[] = [
    {
      name: 'root route requires auth',
      method: 'GET',
      path: '/',
      expected: 'redirect to auth sign-in',
      validate: (response) => expectAuthRedirect(response),
    },
    {
      name: 'today route requires auth',
      method: 'GET',
      path: '/today',
      expected: 'redirect to auth sign-in',
      validate: (response) => expectAuthRedirect(response),
    },
    {
      name: 'library route requires auth',
      method: 'GET',
      path: '/library',
      expected: 'redirect to auth sign-in',
      validate: (response) => expectAuthRedirect(response),
    },
    {
      name: 'reports route requires auth',
      method: 'GET',
      path: '/reports',
      expected: 'redirect to auth sign-in',
      validate: (response) => expectAuthRedirect(response),
    },
    {
      name: 'ingest route requires auth',
      method: 'GET',
      path: '/ingest',
      expected: 'redirect to auth sign-in',
      validate: (response) => expectAuthRedirect(response),
    },
    {
      name: 'pipeline API blocks unauthenticated access',
      method: 'POST',
      path: '/api/runs/pipeline',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ day: '2026-01-01', runMode: 'concept_only' }),
      expected: '401 Unauthorized JSON response',
      validate: (response, bodyText) => expectUnauthorizedJson(response, bodyText),
    },
    {
      name: 'ingest API blocks unauthenticated access',
      method: 'POST',
      path: '/api/ingest',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Smoke check',
        source: 'manual',
        content: 'This request should be rejected by auth before ingestion runs because it is intentionally unauthenticated.',
      }),
      expected: '401 Unauthorized JSON response',
      validate: (response, bodyText) => expectUnauthorizedJson(response, bodyText),
    },
    {
      name: 'cron API rejects missing bearer secret',
      method: 'GET',
      path: '/api/cron/pipeline',
      expected: '401 Unauthorized JSON response',
      validate: (response, bodyText) => expectUnauthorizedJson(response, bodyText),
    },
    {
      name: 'cron API accepts configured bearer secret',
      method: 'GET',
      path: '/api/cron/pipeline',
      headers: cronHeaders,
      expected: '200 JSON response with ok=true',
      validate: (response, bodyText) => {
        if (!cronSecret) {
          return {
            ok: false,
            detail: 'SMOKE_CRON_SECRET, PIPELINE_CRON_SECRET, or CRON_SECRET must be set for the authorized cron smoke step',
          };
        }

        return expectAuthorizedCronSuccess(response, bodyText);
      },
    },
  ];

  return steps;
}

export async function runReleaseSmoke(options: ReleaseSmokeOptions): Promise<ReleaseSmokeRunResult> {
  const normalizedBaseUrl = options.baseUrl.replace(/\/$/, '');
  const steps = buildReleaseSmokePlan(normalizedBaseUrl, options.cronSecret);
  const results: ReleaseSmokeStepResult[] = [];

  for (const step of steps) {
    const url = `${normalizedBaseUrl}${step.path}`;
    const startedAt = Date.now();
    const response = await fetch(url, {
      body: step.body,
      headers: step.headers,
      method: step.method,
      redirect: 'manual',
    });
    const bodyText = await response.text();
    const validation = step.validate(response, bodyText);

    const result: ReleaseSmokeStepResult = {
      name: step.name,
      method: step.method,
      path: step.path,
      url,
      ok: validation.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      expected: step.expected,
      detail: validation.detail,
      location: response.headers.get('location'),
      bodyPreview: previewBody(bodyText),
    };

    results.push(result);
    options.onStep?.(result);
  }

  const failed = results.filter((result) => !result.ok);

  return {
    ok: failed.length === 0,
    baseUrl: normalizedBaseUrl,
    passed: results.length - failed.length,
    failed: failed.length,
    results,
  };
}
