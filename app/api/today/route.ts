import { NextResponse } from 'next/server';
import { getTodayView } from '@/server/services/today.service';
import { client, ensureSchema } from '@/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await ensureSchema(client);
    const todayView = await getTodayView();
  
    return NextResponse.json(todayView, {
      status: 200,
      headers: {
        "Cache-Control": "no-store", // daily content + debugging simplicity
      },
    });
  } catch (error: any) {
    const message = error?.message ?? "Unknown error";
    return NextResponse.json(
      { error: "TODAY_ROUTE_FAILED", message },
      { status: 500 }
    );
  }
}