import { beforeEach, describe, expect, it } from 'vitest';
import {
  evaluateRateLimit,
  getHighCostRoutePolicy,
  getRateLimitCounter,
  resetRateLimitState,
} from '@/server/security/rateLimit';

describe('rateLimit', () => {
  beforeEach(() => {
    resetRateLimitState();
  });

  it('matches the configured high-cost routes', () => {
    expect(getHighCostRoutePolicy('/api/runs/pipeline', 'POST')?.id).toBe('runs-pipeline');
    expect(getHighCostRoutePolicy('/api/artifacts/a1/approve', 'POST')?.id).toBe('artifacts-approve');
    expect(getHighCostRoutePolicy('/api/reports', 'GET')).toBeNull();
  });

  it('blocks once the per-user window is exceeded', () => {
    const now = 1_700_000_000_000;

    for (let count = 0; count < 8; count += 1) {
      const result = evaluateRateLimit({
        pathname: '/api/runs/pipeline',
        method: 'POST',
        userId: 'user-1',
        now,
      });
      expect(result.allowed).toBe(true);
    }

    const blocked = evaluateRateLimit({
      pathname: '/api/runs/pipeline',
      method: 'POST',
      userId: 'user-1',
      now,
    });

    expect(blocked).toMatchObject({
      allowed: false,
      scope: 'user',
    });
    expect(getRateLimitCounter('runs-pipeline', 'user', 'blocked')).toBe(1);
  });

  it('records monitor-only outcomes without blocking the request', () => {
    const now = 1_700_000_000_000;

    for (let count = 0; count < 9; count += 1) {
      const result = evaluateRateLimit({
        pathname: '/api/runs/pipeline',
        method: 'POST',
        userId: 'user-1',
        now,
        monitorOnly: true,
      });
      expect(result.allowed).toBe(true);
    }

    expect(getRateLimitCounter('runs-pipeline', 'user', 'monitor')).toBe(1);
  });
});
