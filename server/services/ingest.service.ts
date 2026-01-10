import { sql } from '@/db';
import { createHash } from 'node:crypto';

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export async function ingestDocument({
  title,
  source,
  content,
}: {
  title: string;
  source: string;
  content: string;
}): Promise<{ documentId: string; created: boolean }> {
  const normalizedContent = normalizeContent(content);
  // 2. Compute a stable content_hash
  const contentHash = sha256(normalizedContent);

  // 4. Insert new document with conflict handling
  const inserted = await sql<Array<{ id: string }>>`
    INSERT INTO documents (title, source, content, content_hash)
    VALUES (${title}, ${source}, ${normalizedContent}, ${contentHash})
    ON CONFLICT (content_hash) DO NOTHING
    RETURNING id
  `;
  if (inserted.length === 0) {
    // If nothing was inserted, it means a conflict occurred (deduplicated)
    const existing = await sql<Array<{ id: string }>>`
      SELECT id FROM documents WHERE content_hash = ${contentHash} LIMIT 1
    `;
    const documentId = existing[0]?.id ?? 'unknown';
    console.log(`[Ingest] Deduplicated document: ${title} (${documentId})`);
    return {
      documentId,
      created: false,
    };
  }
  const documentId = inserted[0].id;
  console.log(`[Ingest] Inserted document: ${title} (${documentId})`);
  console.log(`[Ingest] Created document: ${title} (${documentId})`);

  // TODO: Trigger background jobs (extraction, summarization, etc.)

  return {
    documentId,
    created: true,
  };
}

function normalizeContent(content: string): string {
  // 1. Trim leading/trailing whitespace
  // 2. Normalize newlines (\r\n → \n)
  let normalized = content.trim().replace(/\r\n/g, '\n');

  // 3. Collapse repeated blank lines (e.g., 5 blank lines → 2)
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  // 4. Remove trailing spaces on each line
  normalized = normalized.split('\n').map(line => line.replace(/[ \t]+$/, '')).join('\n');

  // 5. Normalize weird unicode spaces (NBSP → space)
  normalized = normalized.replace(/\u00A0/g, ' '); // Non-breaking space

  return normalized;
}
