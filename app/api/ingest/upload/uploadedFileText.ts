import { formatExtractedUploadText } from './uploadedTextFormatting';

const ALLOWED_UPLOAD_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/csv',
];

const TEXT_FILE_EXTENSIONS = ['.txt', '.md', '.csv'];

export const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024;

export interface UploadedFileTextResult {
  error?: string;
  text: string;
}

export function isAllowedUploadFileType(file: File): boolean {
  const fileName = file.name.toLowerCase();
  return (
    ALLOWED_UPLOAD_TYPES.includes(file.type) ||
    fileName.endsWith('.pdf') ||
    fileName.endsWith('.docx') ||
    TEXT_FILE_EXTENSIONS.some((extension) => fileName.endsWith(extension))
  );
}

export async function extractTextFromUploadedFile(file: File): Promise<UploadedFileTextResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type;
  const fileName = file.name.toLowerCase();

  try {
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const text = await extractTextFromPDF(buffer);
      return { text };
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      const text = await extractTextFromDOCX(buffer);
      return { text };
    }

    if (isPlainTextUpload(mimeType, fileName)) {
      return { text: buffer.toString('utf-8') };
    }

    return { text: '', error: `Unsupported file type: ${mimeType}` };
  } catch (error: unknown) {
    return { text: '', error: error instanceof Error ? error.message : 'Failed to parse file' };
  }
}

function isPlainTextUpload(mimeType: string, fileName: string): boolean {
  return (
    mimeType === 'text/plain' ||
    mimeType === 'text/markdown' ||
    mimeType === 'text/csv' ||
    TEXT_FILE_EXTENSIONS.some((extension) => fileName.endsWith(extension))
  );
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const { extractText } = await import('unpdf');
  const uint8Array = new Uint8Array(buffer);
  const { text } = await extractText(uint8Array);

  let rawText: string;
  if (Array.isArray(text)) {
    rawText = text
      .map((pageText, index) => {
        const trimmed = (pageText || '').trim();
        if (text.length > 1 && trimmed) {
          return `\n---\n**Page ${index + 1}**\n\n${trimmed}`;
        }
        return trimmed;
      })
      .filter(Boolean)
      .join('\n\n');
  } else {
    rawText = String(text ?? '');
  }

  return formatExtractedUploadText(rawText);
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return formatExtractedUploadText(result.value);
}
