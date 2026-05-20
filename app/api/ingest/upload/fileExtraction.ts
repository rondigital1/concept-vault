/**
 * File upload parsing helpers for explicit ingest.
 */

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/markdown",
  "text/csv",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Beautifies raw PDF/DOCX text by fixing line breaks, formatting paragraphs,
 * and detecting headings for better markdown rendering.
 */
function beautifyExtractedText(rawText: string): string {
  if (!rawText) return "";

  const lines = rawText.split("\n");
  const result: string[] = [];
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      result.push(currentParagraph.join(" ").trim());
      currentParagraph = [];
    }
  };

  const isLikelyHeading = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) return false;

    if (trimmed.length < 100 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
      return true;
    }

    return /^(chapter|section|\d+\.|\d+\)|\([a-z]\)|\([0-9]+\))/i.test(trimmed);
  };

  const endsWithPunctuation = (line: string): boolean => {
    const trimmed = line.trim();
    return /[.!?:;]$/.test(trimmed) || /[.!?]["']$/.test(trimmed);
  };

  const isListItem = (line: string): boolean => {
    const trimmed = line.trim();
    return /^[-•*]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed);
  };

  const isMarkdownElement = (line: string): boolean => {
    const trimmed = line.trim();
    return trimmed === "---" || /^\*\*Page \d+\*\*$/.test(trimmed) || /^#{1,6}\s/.test(trimmed);
  };

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (isMarkdownElement(trimmed)) {
      flushParagraph();
      result.push(trimmed);
      continue;
    }

    if (isLikelyHeading(trimmed)) {
      flushParagraph();
      const heading = trimmed.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
      result.push(`\n## ${heading}\n`);
      continue;
    }

    if (isListItem(trimmed)) {
      flushParagraph();
      result.push(trimmed);
      continue;
    }

    currentParagraph.push(trimmed);

    if (endsWithPunctuation(trimmed) && trimmed.length > 40) {
      const nextLine = lines[i + 1]?.trim() || "";
      if (!nextLine || /^[A-Z]/.test(nextLine) || isLikelyHeading(nextLine)) {
        flushParagraph();
      }
    }
  }

  flushParagraph();

  return result
    .filter((p) => p.trim())
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .replace(/\s*-\s*\n\s*/g, "")
    .trim();
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const { extractText } = await import("unpdf");
  const uint8Array = new Uint8Array(buffer);
  const { text } = await extractText(uint8Array);

  const rawText = Array.isArray(text)
    ? text
        .map((pageText, index) => {
          const trimmed = (pageText || "").trim();
          if (text.length > 1 && trimmed) {
            return `\n---\n**Page ${index + 1}**\n\n${trimmed}`;
          }
          return trimmed;
        })
        .filter(Boolean)
        .join("\n\n")
    : String(text ?? "");

  return beautifyExtractedText(rawText);
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return beautifyExtractedText(result.value);
}

export function isAllowedUploadFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  return (
    ALLOWED_FILE_TYPES.includes(file.type) ||
    fileName.endsWith(".pdf") ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".docx") ||
    fileName.endsWith(".md") ||
    fileName.endsWith(".csv")
  );
}

export async function extractTextFromFile(
  file: File,
): Promise<{ text: string; error?: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type;
  const fileName = file.name.toLowerCase();

  try {
    if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
      return { text: await extractTextFromPDF(buffer) };
    }

    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.endsWith(".docx")
    ) {
      return { text: await extractTextFromDOCX(buffer) };
    }

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
  } catch (error: unknown) {
    return { text: "", error: error instanceof Error ? error.message : "Failed to parse file" };
  }
}
