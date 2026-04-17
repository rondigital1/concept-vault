export type RouteErrorBoundary = 'segment' | 'global';

export type ClientRouteErrorPayload = {
  boundary: RouteErrorBoundary;
  pathname: string;
  message: string;
  digest: string | null;
  timestamp: string;
  userAgent: string | null;
};

function truncate(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

export function buildClientRouteErrorPayload(args: {
  error: Error & { digest?: string };
  boundary: RouteErrorBoundary;
  pathname: string;
  timestamp?: string;
  userAgent?: string | null;
}): ClientRouteErrorPayload {
  const pathname = args.pathname.trim() || '/unknown';
  const message = args.error.message.trim() || 'Unknown route error';

  return {
    boundary: args.boundary,
    pathname: truncate(pathname, 512),
    message: truncate(message, 500),
    digest: args.error.digest ? truncate(args.error.digest, 120) : null,
    timestamp: args.timestamp ?? new Date().toISOString(),
    userAgent: args.userAgent ? truncate(args.userAgent, 512) : null,
  };
}

export async function reportRouteError(
  error: Error & { digest?: string },
  boundary: RouteErrorBoundary,
): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = buildClientRouteErrorPayload({
    error,
    boundary,
    pathname: `${window.location.pathname}${window.location.search}`,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  });

  try {
    await fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Best-effort telemetry only. The boundary UI should still render.
  }
}
