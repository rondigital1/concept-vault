#!/usr/bin/env tsx

import { runReleaseSmoke } from '../server/smoke/releaseSmoke';

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function resolveBaseUrl(): string {
  const fromArg = readArg('--base-url');
  const fromEnv = process.env.SMOKE_BASE_URL ?? process.env.BASE_URL;
  const value = fromArg ?? fromEnv ?? 'http://127.0.0.1:3000';
  return value.replace(/\/$/, '');
}

function resolveCronSecret(): string | undefined {
  return process.env.SMOKE_CRON_SECRET ?? process.env.PIPELINE_CRON_SECRET ?? process.env.CRON_SECRET;
}

async function main() {
  const baseUrl = resolveBaseUrl();
  const result = await runReleaseSmoke({
    baseUrl,
    cronSecret: resolveCronSecret(),
    onStep(step) {
      console.log(JSON.stringify({
        type: 'release_smoke_step',
        name: step.name,
        method: step.method,
        path: step.path,
        status: step.status,
        ok: step.ok,
        durationMs: step.durationMs,
        expected: step.expected,
        detail: step.detail,
        location: step.location,
      }));
    },
  });

  console.log(JSON.stringify({
    type: 'release_smoke_summary',
    ok: result.ok,
    baseUrl: result.baseUrl,
    passed: result.passed,
    failed: result.failed,
  }));

  if (!result.ok) {
    const failedSteps = result.results
      .filter((step) => !step.ok)
      .map((step) => `${step.method} ${step.path}: ${step.detail}`)
      .join('\n');

    throw new Error(`Release smoke checks failed:\n${failedSteps}`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
