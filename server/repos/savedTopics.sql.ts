import { sql } from '@/db';

export type SavedTopicJsonParam = Parameters<typeof sql.json>[0];

export function normalizeSavedTopicTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags) {
    const clean = tag.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!clean || clean.length < 2 || clean.length > 40 || seen.has(clean)) {
      continue;
    }

    seen.add(clean);
    normalized.push(clean);
  }

  return normalized.slice(0, 20);
}

export function savedTopicRowSelection() {
  return sql`
    id,
    name,
    goal,
    focus_tags,
    max_docs_per_run,
    min_quality_results,
    min_relevance_score,
    max_iterations,
    max_queries,
    is_active,
    is_tracked,
    cadence,
    last_run_at,
    last_run_mode,
    last_signal_at,
    metadata,
    created_at,
    updated_at
  `;
}
