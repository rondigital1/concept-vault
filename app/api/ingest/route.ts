import { NextResponse } from "next/server";
import { client, ensureSchema } from "@/db";
import { ingestDocument } from "@/server/services/ingest.service";

export const runtime = "nodejs";

type IngestRequest = {
  title?: string;
  source?: string;
  content: string;
};

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    await ensureSchema(client);

    let body: IngestRequest;
    try {
      body = (await request.json()) as IngestRequest;
    } catch {
      return badRequest("Invalid JSON body");
    }

    const rawContent = typeof body.content === "string" ? body.content : "";
    const content = rawContent.trim();

    if (!content) {
      return badRequest("content is required");
    }
    if (content.length < 50) {
      return badRequest("content is too short (min 50 chars)");
    }

    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 200)
        : deriveTitleFromContent(content);

    const source =
      typeof body.source === "string" && body.source.trim()
        ? body.source.trim().slice(0, 500)
        : "manual";

    const result = await ingestDocument({ title, source, content });

    return NextResponse.json(
      { ok: true, documentId: result.documentId, created: result.created },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    const message = error?.message ?? "Unknown error";
    return NextResponse.json(
      { ok: false, error: "INGEST_FAILED", message },
      { status: 500 }
    );
  }
}

function deriveTitleFromContent(content: string): string {
  // MVP: first non-empty line, stripped, bounded
  const firstLine =
    content
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "Untitled";

  // Avoid absurdly long titles
  return firstLine.slice(0, 200);
}