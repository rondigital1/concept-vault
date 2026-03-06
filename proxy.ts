import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

const PUBLIC_FILE = /\.[^/]+$/;

const PUBLIC_PATHS = new Set(['/favicon.ico', '/robots.txt', '/sitemap.xml']);

function isStateChangingMethod(method: string): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

function normalizeEmail(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

const OWNER_EMAIL = normalizeEmail(process.env.OWNER_EMAIL);

function isCrossOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) {
    return false;
  }

  return origin !== request.nextUrl.origin;
}

function isCrossSiteFetchRequest(request: NextRequest): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (!fetchSite) {
    return false;
  }

  return fetchSite === 'cross-site';
}

function appendVary(existing: string | null, value: string): string {
  if (!existing) {
    return value;
  }

  const normalized = existing
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  if (normalized.includes(value.toLowerCase())) {
    return existing;
  }

  return `${existing}, ${value}`;
}

function withPrivateHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Vary', appendVary(response.headers.get('Vary'), 'Cookie'));
  response.headers.set('Vary', appendVary(response.headers.get('Vary'), 'Authorization'));
  return response;
}

function isOwnerSession(request: AuthenticatedRequest): boolean {
  const sessionEmail = normalizeEmail(request.auth?.user?.email);

  if (!OWNER_EMAIL) {
    return process.env.NODE_ENV !== 'production';
  }

  return sessionEmail === OWNER_EMAIL;
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }

  if (PUBLIC_FILE.test(pathname)) {
    return true;
  }

  if (pathname.startsWith('/_next/')) {
    return true;
  }

  if (pathname.startsWith('/api/auth/')) {
    return true;
  }

  if (pathname === '/api/auth') {
    return true;
  }

  if (pathname.startsWith('/api/cron/')) {
    return true;
  }

  if (pathname === '/api/cron') {
    return true;
  }

  return false;
}

export default auth((request) => {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (
    isStateChangingMethod(request.method) &&
    (isCrossOriginRequest(request) || isCrossSiteFetchRequest(request))
  ) {
    if (pathname.startsWith('/api/')) {
      return withPrivateHeaders(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    }
    return withPrivateHeaders(new NextResponse('Forbidden', { status: 403 }));
  }

  if (request.auth) {
    if (!isOwnerSession(request)) {
      if (pathname.startsWith('/api/')) {
        return withPrivateHeaders(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
      }
      return withPrivateHeaders(new NextResponse('Forbidden', { status: 403 }));
    }

    return withPrivateHeaders(NextResponse.next());
  }

  if (pathname.startsWith('/api/')) {
    return withPrivateHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
  }

  const signInUrl = new URL('/api/auth/signin', request.nextUrl.origin);
  signInUrl.searchParams.set('callbackUrl', `${pathname}${search}`);

  return withPrivateHeaders(NextResponse.redirect(signInUrl));
});

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
type AuthenticatedRequest = NextRequest & {
  auth?: {
    user?: {
      email?: string | null;
    } | null;
  } | null;
};
