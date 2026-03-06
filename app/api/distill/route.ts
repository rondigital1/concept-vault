import { NextResponse } from 'next/server';

const MESSAGE =
  'This endpoint has been removed. Use POST /api/runs/pipeline (canonical Curate → WebScout → Distill workflow).';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ error: MESSAGE }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: MESSAGE }, { status: 410 });
}

export async function PUT() {
  return NextResponse.json({ error: MESSAGE }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({ error: MESSAGE }, { status: 410 });
}
