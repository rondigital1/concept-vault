import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

const PUBLIC_FILE = /\.[^/]+$/;

const PUBLIC_PATHS = new Set(['/favicon.ico', '/robots.txt', '/sitemap.xml']);

function isStateChangingMethod(method: string): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

function isCrossOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) {
    return false;
  }

  return origin !== request.nextUrl.origin;
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

  if (isStateChangingMethod(request.method) && isCrossOriginRequest(request)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return new NextResponse('Forbidden', { status: 403 });
  }

  if (request.auth) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const signInUrl = new URL('/api/auth/signin', request.nextUrl.origin);
  signInUrl.searchParams.set('callbackUrl', `${pathname}${search}`);

  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
