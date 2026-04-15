import vercelConfig from '@/vercel.json';

type VercelCron = {
  path: string;
  schedule: string;
};

function isDeprecatedCronPath(path: string): boolean {
  return path === '/api/cron/topic-report' || path === '/api/cron/web-scout';
}

describe('vercel cron config', () => {
  it('only schedules the canonical pipeline cron endpoint', () => {
    const crons = Array.isArray((vercelConfig as { crons?: unknown }).crons)
      ? ((vercelConfig as { crons: VercelCron[] }).crons ?? [])
      : [];

    expect(crons.length).toBeGreaterThan(0);
    expect(crons.every((cron) => cron.path === '/api/cron/pipeline')).toBe(true);
  });

  it('does not schedule deprecated cron endpoints', () => {
    const crons = ((vercelConfig as { crons?: VercelCron[] }).crons ?? []);

    expect(crons.some((cron) => isDeprecatedCronPath(cron.path))).toBe(false);
  });
});
