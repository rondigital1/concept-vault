import { timingSafeEqual } from 'node:crypto';

function parseAuthorizationToken(request: Request): string | null {
  const raw = request.headers.get('authorization');
  if (!raw) {
    return null;
  }

  const [scheme, token] = raw.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  const normalized = token.trim();
  return normalized.length > 0 ? normalized : null;
}

function getExpectedSecret(envKeys: string[]): string | null {
  for (const key of envKeys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function timingSafeMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export function isCronRequestAuthorized(request: Request, envKeys: string[]): boolean {
  const expected = getExpectedSecret(envKeys);

  if (!expected) {
    return process.env.NODE_ENV !== 'production';
  }

  const token = parseAuthorizationToken(request);
  if (!token) {
    return false;
  }

  return timingSafeMatch(token, expected);
}
