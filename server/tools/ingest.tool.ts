import { sql } from '@/db';
import crypto from 'crypto';

export interface IngestInput {
  url?: string;
  text?: string;
  file?: string;
}

export interface IngestOutput {
  documentId: string;
  chunks: number;
}

export async function ingestTool(input: IngestInput): Promise<IngestOutput> {
  // Extract text from title if present (format: "# Title\n\nContent")
  const fullText = input.text || '';
  const lines = fullText.split('\n');
  let title = 'Untitled Document';
  let content = fullText;
  let source = 'chat';

  // Check if first line is a markdown heading
  if (lines[0]?.startsWith('# ')) {
    title = lines[0].substring(2).trim();
    // Remove title line and any blank lines after it
    const contentLines = lines.slice(1);
    const firstContentIndex = contentLines.findIndex(line => line.trim() !== '');
    content = firstContentIndex >= 0 ? contentLines.slice(firstContentIndex).join('\n') : '';
  }

  // Set source based on input type
  if (input.url) {
    source = input.url;
    content = input.text || '';
  } else if (input.file) {
    source = input.file;
  }

  // Create content hash for deduplication
  const contentHash = crypto.createHash('sha256').update(content).digest('hex');

  try {
    // Check if document already exists
    const existing = await sql`
      SELECT id FROM documents WHERE content_hash = ${contentHash}
    `;

    if (existing.length > 0) {
      return {
        documentId: existing[0].id,
        chunks: 1, // Simple chunking for now
      };
    }

    // Insert new document
    const result = await sql`
      INSERT INTO documents (source, title, content, content_hash)
      VALUES (${source}, ${title}, ${content}, ${contentHash})
      RETURNING id
    `;

    return {
      documentId: result[0].id,
      chunks: 1, // TODO: Implement actual chunking in the future
    };
  } catch (error) {
    console.error('Failed to ingest document:', error);
    throw new Error('Failed to save document to database');
  }
}
