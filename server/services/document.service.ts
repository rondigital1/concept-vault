import { sql } from '@/db';
import { createExtractionModel } from '@/server/langchain/models';
import { HumanMessage } from '@langchain/core/messages';

/**
 * Minimal DB shape for the SQL-first `documents` table.
 * Keep this local to avoid coupling to any ORM-generated types.
 */
export type DocumentRow = {
  id: string;
  source: string;
  title: string;
  content: string;
  tags: string[];
  content_hash: string;
  imported_at: string;
};

const STOP_TAGS = new Set([
  'introduction',
  'overview',
  'guide',
  'article',
  'notes',
  'note',
  'example',
  'examples',
  'basics',
  'concepts',
  'summary',
  'summaries',
  'tutorial',
  'how to',
]);

function truncateForPrompt(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[TRUNCATED: original_length=${text.length}]`;
}

function safeParseJsonStringArray(raw: string): string[] {
  // 1) Try direct JSON parse.
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return parsed as string[];
    }
  } catch {
    // ignore
  }

  // 2) Try to extract the first JSON array substring.
  const match = raw.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
        return parsed as string[];
      }
    } catch {
      // ignore
    }
  }

  return [];
}

function normalizeTag(tag: string): string | null {
  let t = tag
    .toLowerCase()
    .trim()
    // Replace punctuation with spaces (defensive)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!t) return null;

  // Drop very short/very long tags (heuristic guardrail)
  if (t.length < 3 || t.length > 40) return null;

  // Drop obvious stop-tags and generic junk
  if (STOP_TAGS.has(t)) return null;

  // Heuristic: discourage sentence-y tags
  const wordCount = t.split(' ').filter(Boolean).length;
  if (wordCount < 1 || wordCount > 3) return null;

  return t;
}

function finalizeTags(candidates: string[], maxFinal: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const c of candidates) {
    const n = normalizeTag(c);
    if (!n) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= maxFinal) break;
  }

  return out;
}

export async function getDocument(documentId: string): Promise<DocumentRow | null> {
  const rows = await sql<Array<DocumentRow>>`
    SELECT id, source, title, content, tags, content_hash, imported_at
    FROM documents
    WHERE id = ${documentId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

/**
 * Get all documents, ordered by most recently imported first
 */
export async function getAllDocuments(): Promise<DocumentRow[]> {
  const rows = await sql<Array<DocumentRow>>`
    SELECT id, source, title, content, tags, content_hash, imported_at
    FROM documents
    ORDER BY imported_at DESC
  `;

  return rows;
}

/**
 * Picks a document for curation from most recent imports.
 * Prioritizes untagged documents, then falls back to the latest document.
 */
export async function getDocumentIdForCuration(): Promise<string | null> {
  const untagged = await sql<Array<{ id: string }>>`
    SELECT id
    FROM documents
    WHERE cardinality(tags) = 0
    ORDER BY imported_at DESC
    LIMIT 1
  `;

  if (untagged[0]?.id) {
    return untagged[0].id;
  }

  const latest = await sql<Array<{ id: string }>>`
    SELECT id
    FROM documents
    ORDER BY imported_at DESC
    LIMIT 1
  `;

  return latest[0]?.id ?? null;
}

/**
 * MVP v1: Extract stable topic tags.
 *
 * IMPORTANT:
 * - The LLM provides *candidates*.
 * - We enforce stability via deterministic normalization + dedupe + capping.
 */
export async function extractTags(content: string): Promise<string[]> {
  // Cost/control: do not send unlimited text.
  const docForPrompt = truncateForPrompt(content, 12_000);

  const prompt = `
You are extracting topic tags from a document.

TASK
Given the document text below, produce a short list of topic tags.

RULES (STRICT)
- Return ONLY a JSON array of strings.
- Maximum 10 tags.
- Each tag must be:
  - lowercase
  - 1–3 words
  - a noun or noun phrase
- No punctuation.
- No explanations.
- No duplicates.
- No generic words like:
  "introduction", "overview", "guide", "article", "notes", "example", "basics", "concepts"
- Do NOT invent jargon.
- Prefer concrete, commonly-used terms.

GOOD TAG EXAMPLES
- spaced repetition
- retrieval practice
- learning science
- distributed systems
- schema design
- vector databases

BAD TAG EXAMPLES
- how to learn better
- interesting ideas
- modern technology
- this article discusses
- memory and learning techniques

DOCUMENT
<<<
${docForPrompt}
>>>

OUTPUT FORMAT
Return only valid JSON. Example:

["spaced repetition", "retrieval practice", "learning science"]
`;

  let raw = '';
  try {
    const model = createExtractionModel({ temperature: 0.3 });
    const response = await model.invoke([new HumanMessage(prompt)]);
    raw = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  } catch {
    return [];
  }

  if (!raw) return [];

  const candidates = safeParseJsonStringArray(raw);
  // Store 5–8 final tags for MVP. Start with 8; you can tune later.
  const finalTags = finalizeTags(candidates, 8);

  return finalTags;
}

export async function categorize(tags: string[]): Promise<string> {
  const allow = ['learning', 'software engineering', 'ai systems', 'finance', 'productivity', 'other'] as const;

  if (!tags.length) return 'other';

  const prompt = `
Choose exactly ONE category for the following tags.

Allowed categories (must match exactly):
${allow.map((c) => `- ${c}`).join('\n')}

Tags:
${tags.join(', ')}

Return ONLY the category string.
`;

  const model = createExtractionModel({ temperature: 0.2 });
  const response = await model.invoke([new HumanMessage(prompt)]);
  const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  const raw = content.toLowerCase().trim();

  const chosen = allow.find((c) => c === raw);
  return chosen ?? 'other';
}

/**
 * Deterministic related-doc lookup (no LLM):
 * - Find docs whose `tags` overlap with this document.
 */
export async function findRelatedDocs(documentId: string): Promise<string[]> {
  const base = await sql<Array<{ tags: string[] }>>`
    SELECT tags FROM documents WHERE id = ${documentId} LIMIT 1
  `;
  const tags = base[0]?.tags ?? [];
  if (!tags.length) return [];

  const rows = await sql<Array<{ id: string }>>`
    SELECT id
    FROM documents
    WHERE id <> ${documentId}
      AND tags && ${sql.array(tags)}
    ORDER BY imported_at DESC
    LIMIT 10
  `;

  return rows.map((r: { id: any; }) => r.id);
}

export async function setDocumentTags(
  documentId: string,
  tags: string[]
): Promise<void> {
  await sql`
    UPDATE documents
    SET tags = ${sql.array(tags)}
    WHERE id = ${documentId}
  `;
}

export async function updateDocumentTitle(
  documentId: string,
  title: string
): Promise<void> {
  await sql`
    UPDATE documents
    SET title = ${title}
    WHERE id = ${documentId}
  `;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await sql`DELETE FROM documents WHERE id = ${documentId}`;
}
