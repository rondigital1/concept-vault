import { client, ensureSchema, sql } from "@/db";
import { z } from 'zod';
import { openAIExecutionService } from '@/server/ai/openai-execution-service';
import { buildPrompt } from '@/server/ai/prompt-builder';
import { AI_TASKS } from '@/server/ai/tasks';

export type LearningBrief = {
  topicTagsUsed: string[];
  resources: Array<{
    type: "article" | "book" | "course";
    title: string;
    url: string;
    domain: string;
    whyThisMatches: string[]; // deterministic reasons
    source: "stub" | "web";
  }>;
};

export type TodayView = {
  date: string;                 // YYYY-MM-DD
  topTags: Array<{ tag: string; count: number }>;
  learningBrief: LearningBrief;
  keyIdeas?: string[];
  interestingFacts?: Array<{ fact: string; source?: string }>;
  randomFact?: { fact: string; source?: string };
};

export type ResearchStep = {
  name: string;
  status: 'running' | 'ok' | 'error' | 'skipped';
  startedAt?: string;
  endedAt?: string;
  error?: string;
};

export type ResearchRun = {
  id: string;
  kind: string;
  status: 'running' | 'ok' | 'error' | 'partial';
  startedAt: string;
  endedAt?: string;
  metadata?: {
    topicId?: string | null;
    runMode?: string | null;
  };
  steps: ResearchStep[];
};

export type ResearchArtifact = {
  id: string;
  runId: string | null;
  day: string;
  agent: string;
  kind: string;
  status: 'proposed' | 'approved' | 'rejected' | 'active';
  title: string;
  preview?: string;
  createdAt: string;
  sourceUrl?: string;
  sourceDocumentId?: string;
  sourceRefs?: Record<string, unknown>;
  content?: Record<string, unknown>;
};

export type ResearchView = {
  date: string;
  runs: ResearchRun[];
  inbox: ResearchArtifact[];
  active: ResearchArtifact[];
};

export type EvidenceReviewRun = Omit<ResearchRun, 'steps'>;

export type EvidenceReviewView = {
  date: string;
  runs: EvidenceReviewRun[];
  inbox: ResearchArtifact[];
  active: ResearchArtifact[];
};

let todaySchemaInitialized = false;
let todaySchemaInFlight: Promise<void> | null = null;

async function ensureTodaySchema(): Promise<void> {
  if (todaySchemaInitialized) return;
  if (todaySchemaInFlight) return todaySchemaInFlight;

  todaySchemaInFlight = (async () => {
    const result = await ensureSchema(client);
    if (!result.ok) {
      throw new Error(result.error || 'Failed to initialize database schema for today service');
    }
    todaySchemaInitialized = true;
  })().finally(() => {
    todaySchemaInFlight = null;
  });

  return todaySchemaInFlight;
}

export async function getTopTags(
  limit = 10
): Promise<Array<{ tag: string; count: number }>> {
  try {
    await ensureTodaySchema();

    // Ensure limit is a valid number
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 10));
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error('[getTopTags] DATABASE_URL is not set');
      return [];
    }
    
    const rows = await sql<Array<{ tag: string; count: number | string | bigint }>>`
      SELECT t.tag AS tag, COUNT(*)::integer AS count
      FROM (
        SELECT unnest(tags) AS tag
        FROM documents
        WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
      ) t
      WHERE t.tag IS NOT NULL AND btrim(t.tag) <> ''
      GROUP BY t.tag
      ORDER BY count DESC
      LIMIT ${safeLimit}
    `;

    return (rows ?? []).map((r) => ({
      tag: r.tag,
      count: typeof r.count === 'number' ? r.count : Number(r.count),
    }));
  } catch (error) {
    // Handle AggregateError (which may contain multiple errors)
    if (error instanceof AggregateError) {
      const messages = error.errors.map((e: unknown) => 
        e instanceof Error ? e.message : String(e)
      ).join('; ');
      console.error('[getTopTags] AggregateError:', {
        message: messages,
        errors: error.errors,
        limit,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
      });
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      
      console.error('[getTopTags] Error details:', {
        name: errorName,
        message: errorMessage,
        stack: errorStack,
        limit,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
      });
    }
    
    // Return empty array on error to prevent breaking the page
    // But log the error so we can debug it
    return [];
  }
}

type WebSearchResult = {
  title: string;
  url: string;
  snippet?: string;
  domain: string;
};

function safeDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

async function tavilySearch(params: {
  query: string;
  maxResults: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  searchDepth?: 'basic' | 'advanced' | 'fast' | 'ultra-fast';
}): Promise<WebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: params.query,
      max_results: Math.max(1, Math.min(20, params.maxResults)),
      search_depth: params.searchDepth ?? 'basic',
      include_answer: false,
      include_raw_content: false,
      include_images: false,
      include_favicon: false,
      include_domains: params.includeDomains,
      exclude_domains: params.excludeDomains,
      topic: 'general',
    }),
  });

  if (!res.ok) {
    // Keep MVP resilient: treat search errors as empty results.
    return [];
  }

  const json: unknown = await res.json();
  const results =
    typeof json === 'object' && json !== null && Array.isArray((json as { results?: unknown }).results)
      ? ((json as { results: unknown[] }).results ?? [])
      : [];

  return results
    .map((r) => {
      const record = typeof r === 'object' && r !== null ? (r as Record<string, unknown>) : {};
      const url = String(record.url ?? '');
      const title = String(record.title ?? '');
      const snippet = String(record.content ?? record.snippet ?? '');
      const domain = safeDomainFromUrl(url) || String(record.domain ?? '');
      return { title, url, snippet, domain } as WebSearchResult;
    })
    .filter((r) => r.title && r.url && isHttpsUrl(r.url));
}

const COURSE_DOMAIN_ALLOWLIST = [
  'coursera.org',
  'edx.org',
  'ocw.mit.edu',
  'udacity.com',
  'pluralsight.com',
  'www.pluralsight.com',
];

const BOOK_DOMAIN_ALLOWLIST = [
  'oreilly.com',
  'www.oreilly.com',
  'manning.com',
  'www.manning.com',
  'hup.harvard.edu',
  'www.hup.harvard.edu',
  'mitpress.mit.edu',
  'www.mitpress.mit.edu',
];

const ARTICLE_DOMAIN_PREFER = [
  'wikipedia.org',
  'arxiv.org',
  'acm.org',
  'ieee.org',
];

function normalizeTitle(t: string): string {
  return t.replace(/\s+/g, ' ').trim();
}

function pickTopUnique(results: WebSearchResult[], max: number): WebSearchResult[] {
  const seen = new Set<string>();
  const picked: WebSearchResult[] = [];
  for (const r of results) {
    const key = r.url;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push({ ...r, title: normalizeTitle(r.title), domain: safeDomainFromUrl(r.url) || r.domain });
    if (picked.length >= max) break;
  }
  return picked;
}

const STUB_RESOURCES_BY_TAG: Record<
  string,
  Array<{
    type: 'article' | 'book' | 'course';
    title: string;
    url: string;
    domain: string;
  }>
> = {
  'spaced repetition': [
    {
      type: 'book',
      title: 'Make It Stick: The Science of Successful Learning',
      url: 'https://www.hup.harvard.edu/books/9780674729018/make-it-stick/',
      domain: 'hup.harvard.edu',
    },
    {
      type: 'article',
      title: 'Spaced repetition',
      url: 'https://en.wikipedia.org/wiki/Spaced_repetition',
      domain: 'wikipedia.org',
    },
    {
      type: 'course',
      title: 'Learning How to Learn (Coursera)',
      url: 'https://www.coursera.org/learn/learning-how-to-learn',
      domain: 'coursera.org',
    },
  ],
  'distributed systems': [
    {
      type: 'book',
      title: 'Designing Data-Intensive Applications',
      url: 'https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/',
      domain: 'oreilly.com',
    },
    {
      type: 'course',
      title: 'Distributed Systems (MIT OpenCourseWare)',
      url: 'https://ocw.mit.edu/courses/6-824-distributed-systems-spring-2020/',
      domain: 'ocw.mit.edu',
    },
    {
      type: 'article',
      title: 'Distributed computing',
      url: 'https://en.wikipedia.org/wiki/Distributed_computing',
      domain: 'wikipedia.org',
    },
  ],
  'vector databases': [
    {
      type: 'article',
      title: 'Vector database',
      url: 'https://en.wikipedia.org/wiki/Vector_database',
      domain: 'wikipedia.org',
    },
    {
      type: 'book',
      title: 'Designing Machine Learning Systems',
      url: 'https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/',
      domain: 'oreilly.com',
    },
    {
      type: 'course',
      title: 'Machine Learning Specialization (Coursera)',
      url: 'https://www.coursera.org/specializations/machine-learning-introduction',
      domain: 'coursera.org',
    },
  ],
};

export async function buildStubLearningBrief(): Promise<LearningBrief> {
  const topTags = await getTopTags(2);
  const topicTagsUsed = topTags.map((t) => t.tag);

  // Gather candidates from the stub catalog
  const candidates = topicTagsUsed.flatMap((tag) => STUB_RESOURCES_BY_TAG[tag] ?? []);

  // Prefer 1 of each type when possible
  const picked: Array<(typeof candidates)[number]> = [];
  const seenUrl = new Set<string>();

  const pickType = (type: 'article' | 'book' | 'course') => {
    const item = candidates.find((c) => c.type === type && !seenUrl.has(c.url));
    if (!item) return;
    seenUrl.add(item.url);
    picked.push(item);
  };

  pickType('article');
  pickType('book');
  pickType('course');

  // Fill remaining slots (if any) from candidates
  for (const c of candidates) {
    if (picked.length >= 3) break;
    if (seenUrl.has(c.url)) continue;
    seenUrl.add(c.url);
    picked.push(c);
  }

  const resources = picked.slice(0, 3).map((r) => {
    const why: string[] = [];
    for (const t of topTags) {
      if (STUB_RESOURCES_BY_TAG[t.tag]?.some((x) => x.url === r.url)) {
        why.push(`matched tag: ${t.tag}`);
        why.push(`you have ${t.count} document(s) tagged ${t.tag}`);
      }
    }

    // Fallback reason if we couldn't map it cleanly
    if (why.length === 0 && topicTagsUsed.length > 0) {
      why.push(`matched tag: ${topicTagsUsed[0]}`);
    }

    return {
      type: r.type,
      title: r.title,
      url: r.url,
      domain: r.domain,
      whyThisMatches: why,
      source: 'stub' as const,
    };
  });

  return {
    topicTagsUsed,
    resources,
  };
}

export async function buildWebLearningBrief(): Promise<LearningBrief> {
  const topTags = await getTopTags(2);
  const topicTagsUsed = topTags.map((t) => t.tag);

  // If no API key or no tags yet, fall back immediately.
  if (!process.env.TAVILY_API_KEY || topicTagsUsed.length === 0) {
    return buildStubLearningBrief();
  }

  // Strategy: 3 focused searches per day (1 credit each on basic):
  // - Article (general/high-quality sources preferred)
  // - Book (publisher allowlist)
  // - Course (platform allowlist)
  // Keep it deterministic and cheap.
  const tag = topicTagsUsed[0];

  const [articleResults, bookResults, courseResults] = await Promise.all([
    tavilySearch({
      query: `${tag} best guide` ,
      maxResults: 8,
      searchDepth: 'basic',
    }),
    tavilySearch({
      query: `${tag} book` ,
      maxResults: 8,
      searchDepth: 'basic',
      includeDomains: BOOK_DOMAIN_ALLOWLIST,
    }),
    tavilySearch({
      query: `${tag} course` ,
      maxResults: 8,
      searchDepth: 'basic',
      includeDomains: COURSE_DOMAIN_ALLOWLIST,
    }),
  ]);

  // Light preference ordering for articles: put preferred domains first.
  const sortedArticles = [...articleResults].sort((a, b) => {
    const aPref = ARTICLE_DOMAIN_PREFER.some((d) => a.domain.endsWith(d)) ? 1 : 0;
    const bPref = ARTICLE_DOMAIN_PREFER.some((d) => b.domain.endsWith(d)) ? 1 : 0;
    return bPref - aPref;
  });

  const pickedArticle = pickTopUnique(sortedArticles, 1)[0];
  const pickedBook = pickTopUnique(bookResults, 1)[0];
  const pickedCourse = pickTopUnique(courseResults, 1)[0];

  const picked = [pickedArticle, pickedBook, pickedCourse].filter(Boolean) as WebSearchResult[];

  // If Tavily gave us too little, fill remaining slots from any results.
  const fallbackPool = pickTopUnique(
    [...sortedArticles, ...bookResults, ...courseResults],
    10
  );

  for (const r of fallbackPool) {
    if (picked.length >= 3) break;
    if (picked.some((p) => p.url === r.url)) continue;
    picked.push(r);
  }

  // Map into the LearningBrief shape.
  const resources = picked.slice(0, 3).map((r, i) => {
    const type: 'article' | 'book' | 'course' =
      i === 0 ? 'article' : i === 1 ? 'book' : 'course';

    const why: string[] = [];
    const primary = topTags[0];
    if (primary) {
      why.push(`matched tag: ${primary.tag}`);
      why.push(`you have ${primary.count} document(s) tagged ${primary.tag}`);
    }

    return {
      type,
      title: r.title,
      url: r.url,
      domain: r.domain,
      whyThisMatches: why,
      source: 'web' as const,
    };
  });

  // Ensure we always return exactly 3 when possible; if not, fall back to stub.
  if (resources.length < 3) {
    return buildStubLearningBrief();
  }

  return {
    topicTagsUsed,
    resources,
  };
}

/**
 * Main entrypoint for MVP: prefer web (Tavily) when configured, otherwise stub.
 */
export async function buildLearningBrief(): Promise<LearningBrief> {
  return process.env.TAVILY_API_KEY ? buildWebLearningBrief() : buildStubLearningBrief();
}

/**
 * Helper: Select 1-2 documents to ground daily content.
 * Prefer documents that match top tags.
 */
async function getSourceDocsForToday(topTags: Array<{ tag: string; count: number }>) {
  await ensureTodaySchema();

  if (topTags.length === 0) return [];

  // Get top 2 tags
  const primaryTags = topTags.slice(0, 2).map(t => t.tag);

  // Find documents that contain these tags
  const docs = await sql<Array<{
    id: string;
    title: string;
    content: string;
    tags: string[];
  }>>`
    SELECT id, title, content, tags
    FROM documents
    WHERE tags && ${sql.array(primaryTags)}
    ORDER BY imported_at DESC
    LIMIT 2
  `;

  // Truncate content to ~1200 chars to reduce token cost
  return docs.map(doc => ({
    id: doc.id,
    title: doc.title,
    content: doc.content.slice(0, 1200),
    tags: doc.tags,
  }));
}

/**
 * Generate additional Today content using LLM.
 * Returns keyIdeas, interestingFacts, and randomFact grounded in user's documents.
 */
async function generateTodayContent(
  sourceDocs: Array<{ id: string; title: string; content: string; tags: string[] }>
): Promise<{
  keyIdeas: string[];
  interestingFacts: Array<{ fact: string; source?: string }>;
  randomFact: { fact: string; source?: string } | null;
}> {
  // If no source docs, return empty
  if (sourceDocs.length === 0) {
    return {
      keyIdeas: [],
      interestingFacts: [],
      randomFact: null,
    };
  }

  const docsText = sourceDocs
    .map((doc, idx) => `[Document ${idx + 1}: "${doc.title}"]\n${doc.content}`)
    .join('\n\n---\n\n');

  const validTitles = sourceDocs.map(d => d.title);
  const TodayContentSchema = z.object({
    keyIdeas: z.array(z.string().min(1)).min(1).max(5),
    interestingFacts: z.array(
      z.object({
        fact: z.string().min(1),
        sourceTitle: z.string().min(1),
      }),
    ).max(4),
    randomFact: z.object({
      fact: z.string().min(1),
      sourceTitle: z.string().min(1),
    }).nullable(),
  });

  try {
    const prompt = buildPrompt({
      task: AI_TASKS.extractStructuredMetadata,
      systemInstructions: [
        {
          heading: 'Role',
          content: "You extract grounded insights from the user's knowledge base.",
        },
        {
          heading: 'Strict Rules',
          content: [
            'Use only the provided documents.',
            'Do not invent facts or sources.',
            'Every fact must be directly supported by the source text.',
            'sourceTitle must exactly match one of the provided titles.',
          ].join('\n'),
        },
      ],
      sharedContext: [
        {
          heading: 'Required Output',
          content: [
            'keyIdeas: 3-5 concise actionable insights.',
            'interestingFacts: up to 4 notable facts with exact source titles.',
            'randomFact: one optional fact with exact source title.',
          ].join('\n'),
        },
      ],
      requestPayload: [
        {
          heading: 'Documents',
          content: docsText,
        },
      ],
    });
    const response = await openAIExecutionService.executeStructured({
      task: AI_TASKS.extractStructuredMetadata,
      prompt,
      schema: TodayContentSchema,
      schemaName: 'today_content',
    });

    const keyIdeas = response.output.keyIdeas.slice(0, 5);
    const interestingFacts = response.output.interestingFacts
      .filter((fact) => validTitles.includes(fact.sourceTitle))
      .slice(0, 4)
      .map((fact) => ({ fact: fact.fact, source: fact.sourceTitle }));
    const randomFact =
      response.output.randomFact && validTitles.includes(response.output.randomFact.sourceTitle)
        ? { fact: response.output.randomFact.fact, source: response.output.randomFact.sourceTitle }
        : null;

    return {
      keyIdeas,
      interestingFacts,
      randomFact,
    };
  } catch (error) {
    console.error('[TodayService] LLM call failed:', error);
    // TODO: Log error to run_steps or llm_calls
    return { keyIdeas: [], interestingFacts: [], randomFact: null };
  }
}

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function asShortPreview(content: unknown, kind: string): string | undefined {
  if (!content || typeof content !== 'object') return undefined;
  const record = content as Record<string, unknown>;

  const candidates: unknown[] = [
    record.summary,
    record.executiveSummary,
    record.fact,
    record.front,
    record.back,
  ];

  if (kind === 'web-proposal' && typeof record.url === 'string' && record.url.trim()) {
    return record.url.trim().slice(0, 180);
  }

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.replace(/\s+/g, ' ').trim().slice(0, 220);
    }
  }

  return undefined;
}

function asHttpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function readSourceDocumentId(sourceRefs: Record<string, unknown>): string | undefined {
  const directCandidates = [sourceRefs.documentId, sourceRefs.document_id];
  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  const pluralCandidates = [sourceRefs.documentIds, sourceRefs.document_ids];
  for (const candidate of pluralCandidates) {
    if (!Array.isArray(candidate)) continue;
    const firstString = candidate.find((v) => typeof v === 'string' && v.trim());
    if (typeof firstString === 'string') {
      return firstString.trim();
    }
  }

  return undefined;
}

function resolveArtifactSourceUrl(params: {
  content: Record<string, unknown>;
  sourceRefs: Record<string, unknown>;
  sourceDocumentId?: string;
  documentSourceById: Map<string, string>;
}): string | undefined {
  const { content, sourceRefs, sourceDocumentId, documentSourceById } = params;

  const inlineUrlCandidates = [content.url, sourceRefs.url, sourceRefs.source];
  for (const candidate of inlineUrlCandidates) {
    const url = asHttpUrl(candidate);
    if (url) return url;
  }

  if (!sourceDocumentId) return undefined;
  return asHttpUrl(documentSourceById.get(sourceDocumentId));
}

function toErrorText(error: unknown): string | undefined {
  if (!error) return undefined;
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (typeof record.message === 'string') return record.message;
  }
  return undefined;
}

function toArtifactStatus(
  status: 'proposed' | 'approved' | 'rejected' | 'superseded',
  mapApprovedToActive = false,
): ResearchArtifact['status'] {
  if (status === 'superseded') return 'rejected';
  if (status === 'approved' && mapApprovedToActive) return 'active';
  return status;
}

/**
 * Lightweight view for /today.
 * This intentionally avoids web search and LLM calls so the page loads quickly.
 */
export async function getResearchView(): Promise<ResearchView> {
  await ensureTodaySchema();
  const date = todayISODate();

  const [inboxRows, activeRows, runRows] = await Promise.all([
    sql<
      Array<{
        id: string;
        run_id: string | null;
        agent: string;
        kind: string;
        day: string;
        title: string;
        content: Record<string, unknown>;
        source_refs: Record<string, unknown>;
        status: 'proposed' | 'approved' | 'rejected' | 'superseded';
        created_at: string;
      }>
    >`
      SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at
      FROM artifacts
      WHERE status = 'proposed'
      ORDER BY created_at DESC
    `,
    sql<
      Array<{
        id: string;
        run_id: string | null;
        agent: string;
        kind: string;
        day: string;
        title: string;
        content: Record<string, unknown>;
        source_refs: Record<string, unknown>;
        status: 'proposed' | 'approved' | 'rejected' | 'superseded';
        created_at: string;
      }>
    >`
      SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at
      FROM artifacts
      WHERE status = 'approved'
      ORDER BY COALESCE(reviewed_at, created_at) DESC
    `,
    sql<
      Array<{
        id: string;
        kind: string;
        status: 'running' | 'ok' | 'error' | 'partial';
        started_at: string;
        ended_at: string | null;
        metadata: Record<string, unknown>;
      }>
    >`
      SELECT id, kind, status, started_at, ended_at, metadata
      FROM runs
      ORDER BY started_at DESC
      LIMIT 12
    `,
  ]);

  const runIds = runRows.map((run) => run.id);
  const stepRows = runIds.length
    ? await sql<
        Array<{
          run_id: string;
          step_name: string;
          status: 'running' | 'ok' | 'error' | 'skipped';
          started_at: string;
          ended_at: string | null;
          error: unknown;
        }>
      >`
        SELECT run_id, step_name, status, started_at, ended_at, error
        FROM run_steps
        WHERE run_id = ANY(${runIds})
          AND (
            step_name = 'pipeline'
            OR step_name LIKE 'pipeline_%'
            OR step_name IN ('curator_start', 'curator_complete', 'webscout_start', 'webscout_complete', 'distiller_start', 'distiller_complete')
          )
        ORDER BY started_at ASC
      `
    : [];

  const stepsByRun = new Map<string, ResearchStep[]>();
  for (const row of stepRows) {
    const existing = stepsByRun.get(row.run_id) ?? [];
    if (existing.length >= 40) {
      continue;
    }
    existing.push({
      name: row.step_name,
      status: row.status,
      startedAt: row.started_at,
      endedAt: row.ended_at ?? undefined,
      error: toErrorText(row.error),
    });
    stepsByRun.set(row.run_id, existing);
  }

  const documentIds = new Set<string>();
  for (const artifact of [...inboxRows, ...activeRows]) {
    const documentId = readSourceDocumentId(artifact.source_refs ?? {});
    if (documentId) {
      documentIds.add(documentId);
    }
  }

  const documentSourceRows = documentIds.size
    ? await sql<Array<{ id: string; source: string }>>`
        SELECT id, source
        FROM documents
        WHERE id = ANY(${Array.from(documentIds)})
      `
    : [];

  const documentSourceById = new Map<string, string>();
  for (const row of documentSourceRows) {
    if (typeof row.source === 'string' && row.source.trim()) {
      documentSourceById.set(row.id, row.source.trim());
    }
  }

  function mapArtifact(
    artifact: {
      id: string;
      run_id: string | null;
      agent: string;
      kind: string;
      day: string;
      title: string;
      content: Record<string, unknown>;
      source_refs: Record<string, unknown>;
      status: 'proposed' | 'approved' | 'rejected' | 'superseded';
      created_at: string;
    },
    mapApprovedToActive = false,
  ): ResearchArtifact {
    const sourceDocumentId = readSourceDocumentId(artifact.source_refs ?? {});
    return {
      id: artifact.id,
      runId: artifact.run_id,
      day: artifact.day,
      agent: artifact.agent,
      kind: artifact.kind,
      status: toArtifactStatus(artifact.status, mapApprovedToActive),
      title: artifact.title,
      preview: asShortPreview(artifact.content, artifact.kind),
      createdAt: artifact.created_at,
      sourceDocumentId,
      sourceUrl: resolveArtifactSourceUrl({
        content: artifact.content ?? {},
        sourceRefs: artifact.source_refs ?? {},
        sourceDocumentId,
        documentSourceById,
      }),
      sourceRefs: artifact.source_refs,
      content: artifact.content,
    };
  }

  return {
    date,
    runs: runRows.map((run) => ({
      id: run.id,
      kind: run.kind,
      status: run.status,
      startedAt: run.started_at,
      endedAt: run.ended_at ?? undefined,
      metadata: {
        topicId:
          typeof run.metadata?.topicId === 'string' && run.metadata.topicId.trim().length > 0
            ? run.metadata.topicId.trim()
            : null,
        runMode:
          typeof run.metadata?.runMode === 'string' && run.metadata.runMode.trim().length > 0
            ? run.metadata.runMode.trim()
            : null,
      },
      steps: stepsByRun.get(run.id) ?? [],
    })),
    inbox: inboxRows.map((artifact) => mapArtifact(artifact)),
    active: activeRows.map((artifact) => mapArtifact(artifact, true)),
  };
}

export async function getEvidenceReviewView(): Promise<EvidenceReviewView> {
  await ensureTodaySchema();
  const date = todayISODate();

  const [inboxRows, activeRows, runRows] = await Promise.all([
    sql<
      Array<{
        id: string;
        run_id: string | null;
        agent: string;
        kind: string;
        day: string;
        title: string;
        content: Record<string, unknown>;
        source_refs: Record<string, unknown>;
        status: 'proposed' | 'approved' | 'rejected' | 'superseded';
        created_at: string;
      }>
    >`
      SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at
      FROM artifacts
      WHERE status = 'proposed'
      ORDER BY created_at DESC
    `,
    sql<
      Array<{
        id: string;
        run_id: string | null;
        agent: string;
        kind: string;
        day: string;
        title: string;
        content: Record<string, unknown>;
        source_refs: Record<string, unknown>;
        status: 'proposed' | 'approved' | 'rejected' | 'superseded';
        created_at: string;
      }>
    >`
      SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at
      FROM artifacts
      WHERE status = 'approved'
      ORDER BY COALESCE(reviewed_at, created_at) DESC
    `,
    sql<
      Array<{
        id: string;
        kind: string;
        status: 'running' | 'ok' | 'error' | 'partial';
        started_at: string;
        ended_at: string | null;
        metadata: Record<string, unknown>;
      }>
    >`
      SELECT id, kind, status, started_at, ended_at, metadata
      FROM runs
      ORDER BY started_at DESC
      LIMIT 12
    `,
  ]);

  const documentIds = new Set<string>();
  for (const artifact of [...inboxRows, ...activeRows]) {
    const documentId = readSourceDocumentId(artifact.source_refs ?? {});
    if (documentId) {
      documentIds.add(documentId);
    }
  }

  const documentSourceRows = documentIds.size
    ? await sql<Array<{ id: string; source: string }>>`
        SELECT id, source
        FROM documents
        WHERE id = ANY(${Array.from(documentIds)})
      `
    : [];

  const documentSourceById = new Map<string, string>();
  for (const row of documentSourceRows) {
    if (typeof row.source === 'string' && row.source.trim()) {
      documentSourceById.set(row.id, row.source.trim());
    }
  }

  function mapArtifact(
    artifact: {
      id: string;
      run_id: string | null;
      agent: string;
      kind: string;
      day: string;
      title: string;
      content: Record<string, unknown>;
      source_refs: Record<string, unknown>;
      status: 'proposed' | 'approved' | 'rejected' | 'superseded';
      created_at: string;
    },
    mapApprovedToActive = false,
  ): ResearchArtifact {
    const sourceDocumentId = readSourceDocumentId(artifact.source_refs ?? {});
    return {
      id: artifact.id,
      runId: artifact.run_id,
      day: artifact.day,
      agent: artifact.agent,
      kind: artifact.kind,
      status: toArtifactStatus(artifact.status, mapApprovedToActive),
      title: artifact.title,
      preview: asShortPreview(artifact.content, artifact.kind),
      createdAt: artifact.created_at,
      sourceDocumentId,
      sourceUrl: resolveArtifactSourceUrl({
        content: artifact.content ?? {},
        sourceRefs: artifact.source_refs ?? {},
        sourceDocumentId,
        documentSourceById,
      }),
      sourceRefs: artifact.source_refs,
      content: artifact.content,
    };
  }

  return {
    date,
    runs: runRows.map((run) => ({
      id: run.id,
      kind: run.kind,
      status: run.status,
      startedAt: run.started_at,
      endedAt: run.ended_at ?? undefined,
      metadata: {
        topicId:
          typeof run.metadata?.topicId === 'string' && run.metadata.topicId.trim().length > 0
            ? run.metadata.topicId.trim()
            : null,
        runMode:
          typeof run.metadata?.runMode === 'string' && run.metadata.runMode.trim().length > 0
            ? run.metadata.runMode.trim()
            : null,
      },
    })),
    inbox: inboxRows.map((artifact) => mapArtifact(artifact)),
    active: activeRows.map((artifact) => mapArtifact(artifact, true)),
  };
}

export const getAgentControlCenterView = getResearchView;
export type AgentControlStep = ResearchStep;
export type AgentControlRun = ResearchRun;
export type AgentControlArtifact = ResearchArtifact;
export type AgentControlCenterView = ResearchView;

export async function getTodayView(): Promise<TodayView> {
  const date = todayISODate();
  const topTags = await getTopTags(10);
  const learningBrief = await buildLearningBrief();

  // Generate additional content from user's documents
  const sourceDocs = await getSourceDocsForToday(topTags);
  const additionalContent = await generateTodayContent(sourceDocs);

  return {
    date,
    topTags,
    learningBrief,
    keyIdeas: additionalContent.keyIdeas.length > 0 ? additionalContent.keyIdeas : undefined,
    interestingFacts: additionalContent.interestingFacts.length > 0 ? additionalContent.interestingFacts : undefined,
    randomFact: additionalContent.randomFact || undefined,
  };
}
