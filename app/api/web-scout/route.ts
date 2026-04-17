import { deprecatedRouteResponse } from '@/server/http/deprecatedRoute';

export const runtime = 'nodejs';

const route = '/api/web-scout';
const replacement = '/api/runs/pipeline';

export async function GET(request: Request) {
  return deprecatedRouteResponse(request, { route, replacement });
}

export async function POST(request: Request) {
  return deprecatedRouteResponse(request, { route, replacement });
}

export async function PUT(request: Request) {
  return deprecatedRouteResponse(request, { route, replacement });
}

export async function DELETE(request: Request) {
  return deprecatedRouteResponse(request, { route, replacement });
}
