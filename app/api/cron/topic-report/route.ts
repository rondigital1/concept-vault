import { NextResponse } from 'next/server';

const MESSAGE =
  'This cron endpoint has been removed. Use /api/cron/pipeline for the canonical workflow.';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ error: MESSAGE }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: MESSAGE }, { status: 410 });
}
