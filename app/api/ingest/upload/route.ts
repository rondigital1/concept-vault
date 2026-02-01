import { NextResponse } from "next/server";
import { client, ensureSchema } from "@/db";
import { ingestDocument } from "@/server/services/ingest.service";

export const runtime = "nodejs";

/**
 * Beautifies raw PDF text by fixing line breaks, formatting paragraphs,
 * and detecting headings for better markdown rendering.
 */
function beautifyPdfText(rawText: string): string {
  if (!rawText) return "";

  // Split into lines and process
  const lines = rawText.split("\n");
  const result: string[] = [];
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      result.push(currentParagraph.join(" ").trim());
      currentParagraph = [];
    }
  };

  // Patterns for detecting headings
  const isLikelyHeading = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) return false;

    // All caps lines that are short (likely section headers)
    if (
      trimmed.length < 100 &&
      trimmed === trimmed.toUpperCase() &&
      /[A-Z]/.test(trimmed)
    ) {
      return true;
    }

    // Numbered sections like "1.", "1.1", "Chapter 1", etc.
    if (/^(chapter|section|\d+\.|\d+\)|\([a-z]\)|\([0-9]+\))/i.test(trimmed)) {
      return true;
    }

    return false;
  };

  // Check if line ends with sentence-ending punctuation
  const endsWithPunctuation = (line: string): boolean => {
    const trimmed = line.trim();
    return /[.!?:;]$/.test(trimmed) || /[.!?]["']$/.test(trimmed);
  };

  // Check if line looks like a list item
  const isListItem = (line: string): boolean => {
    const trimmed = line.trim();
    return /^[-•*]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed);
  };

  // Check if line is a markdown element we should preserve
  const isMarkdownElement = (line: string): boolean => {
    const trimmed = line.trim();
    return (
      trimmed === "---" ||
      /^\*\*Page \d+\*\*$/.test(trimmed) ||
      /^#{1,6}\s/.test(trimmed)
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line = paragraph break
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // Preserve markdown elements (page markers, existing headings, dividers)
    if (isMarkdownElement(trimmed)) {
      flushParagraph();
      result.push(trimmed);
      continue;
    }

    // Detect headings and format them
    if (isLikelyHeading(trimmed)) {
      flushParagraph();
      // Convert to title case for markdown heading
      const heading = trimmed
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
      result.push(`\n## ${heading}\n`);
      continue;
    }

    // List items should stay on their own lines
    if (isListItem(trimmed)) {
      flushParagraph();
      result.push(trimmed);
      continue;
    }

    // Add line to current paragraph
    currentParagraph.push(trimmed);

    // If line ends with sentence punctuation and is reasonably long,
    // or if next line looks like a new section, flush paragraph
    if (endsWithPunctuation(trimmed) && trimmed.length > 40) {
      const nextLine = lines[i + 1]?.trim() || "";
      // Check if next line starts with capital or is empty
      if (!nextLine || /^[A-Z]/.test(nextLine) || isLikelyHeading(nextLine)) {
        flushParagraph();
      }
    }
  }

  // Flush any remaining paragraph
  flushParagraph();

  // Join with double newlines for proper paragraph spacing
  let output = result
    .filter((p) => p.trim())
    .join("\n\n")
    // Clean up excessive whitespace
    .replace(/\n{3,}/g, "\n\n")
    // Clean up spaces
    .replace(/ {2,}/g, " ")
    // Fix common PDF artifacts
    .replace(/\s*-\s*\n\s*/g, "") // Remove hyphenation at line breaks
    .trim();

  return output;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/markdown",
  "text/csv",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const { extractText } = await import("unpdf");
  const uint8Array = new Uint8Array(buffer);
  const { text } = await extractText(uint8Array);

  // text is an array of strings (one per page)
  let rawText: string;
  if (Array.isArray(text)) {
    // Join pages with double newlines to preserve page breaks
    rawText = text
      .map((pageText, index) => {
        const trimmed = (pageText || "").trim();
        // Add page separator for multi-page documents
        if (text.length > 1 && trimmed) {
          return `\n---\n**Page ${index + 1}**\n\n${trimmed}`;
        }
        return trimmed;
      })
      .filter(Boolean)
      .join("\n\n");
  } else {
    rawText = String(text ?? "");
  }

  // Beautify the extracted text for better markdown rendering
  return beautifyPdfText(rawText);
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  // Beautify DOCX text for consistent formatting
  return beautifyPdfText(result.value);
}

async function extractTextFromFile(
  file: File
): Promise<{ text: string; error?: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type;
  const fileName = file.name.toLowerCase();

  try {
    // PDF
    if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
      const text = await extractTextFromPDF(buffer);
      return { text };
    }

    // DOCX
    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.endsWith(".docx")
    ) {
      const text = await extractTextFromDOCX(buffer);
      return { text };
    }

    // Plain text, markdown, CSV
    if (
      mimeType === "text/plain" ||
      mimeType === "text/markdown" ||
      mimeType === "text/csv" ||
      fileName.endsWith(".txt") ||
      fileName.endsWith(".md") ||
      fileName.endsWith(".csv")
    ) {
      return { text: buffer.toString("utf-8") };
    }

    return { text: "", error: `Unsupported file type: ${mimeType}` };
  } catch (err: any) {
    return { text: "", error: err?.message || "Failed to parse file" };
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema(client);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const titleInput = formData.get("title") as string | null;

    if (!file) {
      return badRequest("No file provided");
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return badRequest(
        `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    const isAllowedType =
      ALLOWED_TYPES.includes(file.type) ||
      fileName.endsWith(".pdf") ||
      fileName.endsWith(".txt") ||
      fileName.endsWith(".docx") ||
      fileName.endsWith(".md") ||
      fileName.endsWith(".csv");

    if (!isAllowedType) {
      return badRequest(
        "Unsupported file type. Allowed: PDF, TXT, DOCX, MD, CSV"
      );
    }

    // Extract text from file
    const { text, error: parseError } = await extractTextFromFile(file);

    if (parseError) {
      return badRequest(parseError);
    }

    const content = text.trim();

    if (!content) {
      return badRequest("Could not extract any text from the file");
    }

    if (content.length < 50) {
      return badRequest(
        "Extracted content is too short (min 50 chars). The file may be empty or contain only images."
      );
    }

    // Derive title from filename if not provided
    const title =
      titleInput?.trim() ||
      file.name.replace(/\.[^/.]+$/, "").slice(0, 200) ||
      "Untitled";

    const source = `file:${file.name}`;

    const result = await ingestDocument({ title, source, content });

    return NextResponse.json(
      {
        ok: true,
        documentId: result.documentId,
        created: result.created,
        extractedLength: content.length,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("File upload error:", error);
    const message = error?.message ?? "Unknown error";
    return NextResponse.json(
      { ok: false, error: "UPLOAD_FAILED", message },
      { status: 500 }
    );
  }
}
