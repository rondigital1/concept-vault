import { NextResponse } from 'next/server';

const MESSAGE =
  'This endpoint has been removed. Use POST /api/runs/pipeline (canonical Curate → WebScout → Distill workflow).';

export const runtime = 'nodejs';

function gone() {
  return NextResponse.json({ error: MESSAGE }, { status: 410 });
}

export async function GET() {
  return gone();
}

export async function POST() {
  return gone();
}
