export interface RateLimitWindow {
  limit: number;
  windowMs: number;
}

export interface HighCostRoutePolicy {
  id: string;
  ip: RateLimitWindow;
  method: 'POST';
  pathname: RegExp;
  user: RateLimitWindow;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

type RateLimitScope = 'ip' | 'user';
type RateLimitOutcome = 'blocked' | 'monitor';

const WINDOW_MINUTE = 60_000;

const rateBuckets = new Map<string, RateBucket>();
const rateLimitCounters = new Map<string, number>();

export const HIGH_COST_ROUTE_POLICIES: readonly HighCostRoutePolicy[] = [
  {
    id: 'runs-pipeline',
    pathname: /^\/api\/runs\/pipeline$/,
    method: 'POST',
    user: { limit: 8, windowMs: 10 * WINDOW_MINUTE },
    ip: { limit: 20, windowMs: 10 * WINDOW_MINUTE },
  },
  {
    id: 'runs-generate-report',
    pathname: /^\/api\/runs\/generate-report$/,
    method: 'POST',
    user: { limit: 8, windowMs: 10 * WINDOW_MINUTE },
    ip: { limit: 20, windowMs: 10 * WINDOW_MINUTE },
  },
  {
    id: 'runs-find-sources',
    pathname: /^\/api\/runs\/find-sources$/,
    method: 'POST',
    user: { limit: 8, windowMs: 10 * WINDOW_MINUTE },
    ip: { limit: 20, windowMs: 10 * WINDOW_MINUTE },
  },
  {
    id: 'runs-refresh-concepts',
    pathname: /^\/api\/runs\/refresh-concepts$/,
    method: 'POST',
    user: { limit: 10, windowMs: 10 * WINDOW_MINUTE },
    ip: { limit: 24, windowMs: 10 * WINDOW_MINUTE },
  },
  {
    id: 'runs-refresh-topic',
    pathname: /^\/api\/runs\/refresh-topic$/,
    method: 'POST',
    user: { limit: 10, windowMs: 10 * WINDOW_MINUTE },
    ip: { limit: 24, windowMs: 10 * WINDOW_MINUTE },
  },
  {
    id: 'ingest-manual',
    pathname: /^\/api\/ingest$/,
    method: 'POST',
    user: { limit: 16, windowMs: 10 * WINDOW_MINUTE },
    ip: { limit: 32, windowMs: 10 * WINDOW_MINUTE },
  },
  {
    id: 'ingest-llm',
    pathname: /^\/api\/ingest\/llm$/,
    method: 'POST',
    user: { limit: 16, windowMs: 10 * WINDOW_MINUTE },
    ip: { limit: 32, windowMs: 10 * WINDOW_MINUTE },
  },
  {
    id: 'ingest-upload',
    pathname: /^\/api\/ingest\/upload$/,
    method: 'POST',
    user: { limit: 10, windowMs: 15 * WINDOW_MINUTE },
    ip: { limit: 20, windowMs: 15 * WINDOW_MINUTE },
  },
  {
    id: 'artifacts-approve',
    pathname: /^\/api\/artifacts\/[^/]+\/approve$/,
    method: 'POST',
    user: { limit: 8, windowMs: 10 * WINDOW_MINUTE },
    ip: { limit: 20, windowMs: 10 * WINDOW_MINUTE },
  },
] as const;

function counterKey(routeId: string, scope: RateLimitScope, outcome: RateLimitOutcome): string {
  return `${routeId}:${scope}:${outcome}`;
}

function bucketKey(routeId: string, scope: RateLimitScope, identity: string): string {
  return `${routeId}:${scope}:${identity}`;
}

function incrementCounter(routeId: string, scope: RateLimitScope, outcome: RateLimitOutcome): number {
  const key = counterKey(routeId, scope, outcome);
  const nextCount = (rateLimitCounters.get(key) ?? 0) + 1;
  rateLimitCounters.set(key, nextCount);
  return nextCount;
}

function pruneExpiredBuckets(now: number): void {
  for (const [key, bucket] of rateBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateBuckets.delete(key);
    }
  }
}

function consumeRateWindow(params: {
  identity: string;
  now: number;
  routeId: string;
  scope: RateLimitScope;
  window: RateLimitWindow;
}): { exceeded: boolean; remaining: number; resetAt: number; count: number } {
  pruneExpiredBuckets(params.now);

  const key = bucketKey(params.routeId, params.scope, params.identity);
  const current = rateBuckets.get(key);
  const bucket =
    current && current.resetAt > params.now
      ? current
      : {
          count: 0,
          resetAt: params.now + params.window.windowMs,
        };

  bucket.count += 1;
  rateBuckets.set(key, bucket);

  return {
    exceeded: bucket.count > params.window.limit,
    remaining: Math.max(params.window.limit - bucket.count, 0),
    resetAt: bucket.resetAt,
    count: bucket.count,
  };
}

function maskIdentity(identity: string): string {
  if (identity.length <= 8) {
    return identity;
  }

  return `${identity.slice(0, 4)}…${identity.slice(-4)}`;
}

function recordLimitEvent(params: {
  count: number;
  identity: string;
  mode: RateLimitOutcome;
  policy: HighCostRoutePolicy;
  retryAfterMs: number;
  scope: RateLimitScope;
}): void {
  const counter = incrementCounter(params.policy.id, params.scope, params.mode);
  console.warn(
    `[rate-limit] route=${params.policy.id} scope=${params.scope} mode=${params.mode} identity=${maskIdentity(params.identity)} count=${params.count} counter=${counter} retryAfterMs=${params.retryAfterMs}`,
  );
}

export function getHighCostRoutePolicy(
  pathname: string,
  method: string,
): HighCostRoutePolicy | null {
  for (const policy of HIGH_COST_ROUTE_POLICIES) {
    if (policy.method === method && policy.pathname.test(pathname)) {
      return policy;
    }
  }

  return null;
}

export function isHighCostRoute(pathname: string, method: string): boolean {
  return getHighCostRoutePolicy(pathname, method) !== null;
}

export function evaluateRateLimit(params: {
  ip?: string | null;
  method: string;
  monitorOnly?: boolean;
  now?: number;
  pathname: string;
  userId?: string | null;
}):
  | { allowed: true; policy: HighCostRoutePolicy | null }
  | {
      allowed: false;
      policy: HighCostRoutePolicy;
      retryAfterSeconds: number;
      scope: RateLimitScope;
    } {
  const policy = getHighCostRoutePolicy(params.pathname, params.method);
  if (!policy) {
    return { allowed: true, policy: null };
  }

  const now = params.now ?? Date.now();
  const subjects: Array<{ identity: string; scope: RateLimitScope; window: RateLimitWindow }> = [];

  if (params.ip) {
    subjects.push({ identity: params.ip, scope: 'ip', window: policy.ip });
  }
  if (params.userId) {
    subjects.push({ identity: params.userId, scope: 'user', window: policy.user });
  }

  for (const subject of subjects) {
    const result = consumeRateWindow({
      identity: subject.identity,
      now,
      routeId: policy.id,
      scope: subject.scope,
      window: subject.window,
    });

    if (!result.exceeded) {
      continue;
    }

    const retryAfterMs = Math.max(result.resetAt - now, 0);
    if (params.monitorOnly) {
      recordLimitEvent({
        count: result.count,
        identity: subject.identity,
        mode: 'monitor',
        policy,
        retryAfterMs,
        scope: subject.scope,
      });
      continue;
    }

    recordLimitEvent({
      count: result.count,
      identity: subject.identity,
      mode: 'blocked',
      policy,
      retryAfterMs,
      scope: subject.scope,
    });

    return {
      allowed: false,
      policy,
      retryAfterSeconds: Math.max(Math.ceil(retryAfterMs / 1_000), 1),
      scope: subject.scope,
    };
  }

  return { allowed: true, policy };
}

export function getRateLimitCounter(
  routeId: string,
  scope: RateLimitScope,
  outcome: RateLimitOutcome,
): number {
  return rateLimitCounters.get(counterKey(routeId, scope, outcome)) ?? 0;
}

export function resetRateLimitState(): void {
  rateBuckets.clear();
  rateLimitCounters.clear();
}
