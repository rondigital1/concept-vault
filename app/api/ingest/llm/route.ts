import { ingestDocument } from "@/server/services/ingest.service";
import { NextResponse } from "next/server";

type IngestRequest = {
  title?: string;
  content: string;
  origin: {
    feature: "llm:chat";
    runId?: string;
    messageId?: string;
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, origin } = body as IngestRequest;

    if (!content) {
      return NextResponse.json(
        { ok: false, error: "INGEST_FAILED", message: "Content is required" },
        { status: 400 }
      );
    }

    if (content.length < 20) {
      return NextResponse.json(
        { ok: false, error: "INGEST_FAILED", message: "Content must be at least 20 characters" },
        { status: 400 }
      );
    }

    const result = await ingestDocument({ title: title ?? "Untitled", source: origin.feature, content });

    return NextResponse.json(
      { ok: true, documentId: result.documentId, created: result.created },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error processing LLM ingest request:", error);
    return NextResponse.json(
      { ok: false, error: "INGEST_FAILED", message: "Failed to process LLM ingest request" },
      { status: 500 }
    );
  }
}