import { NextResponse } from "next/server";
import { client, ensureSchema } from "@/db";
import { ingestDocument } from "@/server/services/ingest.service";
import { extractDocumentFromUrl, isHttpUrl } from "@/server/services/urlExtract.service";

export const runtime = "nodejs";

type IngestRequest = {
  title?: string;
  source?: string;
  content?: string;
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

    const source =
      typeof body.source === "string" && body.source.trim()
        ? body.source.trim().slice(0, 500)
        : "manual";
    const rawContent = typeof body.content === "string" ? body.content : "";
    let content = rawContent.trim();
    let extractedTitle: string | undefined;

    const shouldExtractFromUrl = isHttpUrl(source) && content.length < 50;

    if (shouldExtractFromUrl) {
      try {
        const extraction = await extractDocumentFromUrl(source);
        content = extraction.content;
        extractedTitle = extraction.title;
      } catch (error: any) {
        if (!content) {
          return badRequest(error?.message ?? "Failed to extract content from URL");
        }
      }
    }

    if (!content) {
      return badRequest("content is required for non-URL sources");
    }
    if (content.length < 50) {
      return badRequest("content is too short (min 50 chars)");
    }

    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 200)
        : extractedTitle
          ? extractedTitle.slice(0, 200)
        : deriveTitleFromContent(content);

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
