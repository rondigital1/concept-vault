import { sql } from "@/db";

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

export async function getTopTags(
  limit = 10
): Promise<Array<{ tag: string; count: number }>> {
  try {
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
      const messages = error.errors.map((e: any) => 
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

  const json: any = await res.json();
  const results: any[] = Array.isArray(json?.results) ? json.results : [];

  return results
    .map((r) => {
      const url = String(r?.url ?? '');
      const title = String(r?.title ?? '');
      const snippet = String(r?.content ?? r?.snippet ?? '');
      const domain = safeDomainFromUrl(url) || String(r?.domain ?? '');
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

  // Import LLM gateway
  const { callLLM } = await import('@/server/llm/modelGateway');

  // Build prompt with strict instructions
  const docsText = sourceDocs
    .map((doc, idx) => `[Document ${idx + 1}: "${doc.title}"]\n${doc.content}`)
    .join('\n\n---\n\n');

  const validTitles = sourceDocs.map(d => d.title);

  const prompt = `You are extracting key insights from the user's knowledge base.

STRICT RULES:
- Use ONLY the provided documents below
- Do NOT invent facts or sources
- All outputs must be directly supported by the text
- Return ONLY valid JSON, no prose
- sourceTitle must EXACTLY match one of the document titles provided

DOCUMENTS:
${docsText}

OUTPUT FORMAT (strict JSON):
{
  "keyIdeas": ["idea 1", "idea 2", "idea 3"],
  "interestingFacts": [
    { "fact": "...", "sourceTitle": "exact title from documents" },
    { "fact": "...", "sourceTitle": "exact title from documents" }
  ],
  "randomFact": { "fact": "...", "sourceTitle": "exact title from documents" }
}

REQUIREMENTS:
- keyIdeas: 3-5 concise bullets (actionable insights or principles)
- interestingFacts: 2-4 surprising or notable facts
- randomFact: 1 fun or unexpected fact
- Each fact MUST reference a sourceTitle from the list above

Generate the JSON now:`;

  try {
    const startTime = Date.now();
    const response = await callLLM([{ role: 'user', content: prompt }], {
      temperature: 0.3,
      maxTokens: 800,
    });
    const duration = Date.now() - startTime;

    console.log(`[TodayService] LLM call completed in ${duration}ms`);
    // TODO: Log to llm_calls table for observability

    // Parse and validate JSON
    const raw = response.content.trim();
    let parsed: any;

    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || raw.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : raw;
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[TodayService] JSON parse failed:', parseError);
      return { keyIdeas: [], interestingFacts: [], randomFact: null };
    }

    // Validate structure
    const keyIdeas = Array.isArray(parsed.keyIdeas)
      ? parsed.keyIdeas.filter((k: any) => typeof k === 'string').slice(0, 5)
      : [];

    const interestingFacts = Array.isArray(parsed.interestingFacts)
      ? parsed.interestingFacts
          .filter((f: any) =>
            f &&
            typeof f.fact === 'string' &&
            typeof f.sourceTitle === 'string' &&
            validTitles.includes(f.sourceTitle) // Anti-hallucination check
          )
          .slice(0, 4)
          .map((f: any) => ({ fact: f.fact, source: f.sourceTitle }))
      : [];

    const randomFact =
      parsed.randomFact &&
      typeof parsed.randomFact.fact === 'string' &&
      typeof parsed.randomFact.sourceTitle === 'string' &&
      validTitles.includes(parsed.randomFact.sourceTitle)
        ? { fact: parsed.randomFact.fact, source: parsed.randomFact.sourceTitle }
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