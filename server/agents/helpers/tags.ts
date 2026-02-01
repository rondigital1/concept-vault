/**
 * Tag normalization utilities for the Curator agent.
 */

const STOP_TAGS = new Set([
  'introduction', 'overview', 'guide', 'article', 'notes', 'note',
  'example', 'examples', 'basics', 'concepts', 'summary', 'summaries',
  'tutorial', 'how to',
]);

/**
 * Normalize a raw tag to a standardized form.
 * Returns null if the tag should be filtered out.
 */
export function normalizeTag(tag: string): string | null {
  let t = tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!t || t.length < 3 || t.length > 40) return null;
  if (STOP_TAGS.has(t)) return null;

  const wordCount = t.split(' ').filter(Boolean).length;
  if (wordCount < 1 || wordCount > 3) return null;

  return t;
}

/**
 * Process raw tag candidates into a deduplicated, normalized list.
 */
export function finalizeTags(candidates: string[], maxFinal: number = 8): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const c of candidates) {
    const n = normalizeTag(c);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= maxFinal) break;
  }

  return out;
}
