import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import type { LearningBrief } from '@/server/services/today.types';
import { getTopTags } from '@/server/services/todayTags.service';

type WebSearchResult = {
  title: string;
  url: string;
  snippet?: string;
  domain: string;
};

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

function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim();
}

function pickTopUnique(results: WebSearchResult[], max: number): WebSearchResult[] {
  const seen = new Set<string>();
  const picked: WebSearchResult[] = [];

  for (const result of results) {
    const key = result.url;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    picked.push({
      ...result,
      title: normalizeTitle(result.title),
      domain: safeDomainFromUrl(result.url) || result.domain,
    });

    if (picked.length >= max) {
      break;
    }
  }

  return picked;
}

async function tavilySearch(params: {
  query: string;
  maxResults: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  searchDepth?: 'basic' | 'advanced' | 'fast' | 'ultra-fast';
}): Promise<WebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return [];
  }

  const response = await fetch('https://api.tavily.com/search', {
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

  if (!response.ok) {
    return [];
  }

  const json: unknown = await response.json();
  const results =
    typeof json === 'object' && json !== null && Array.isArray((json as { results?: unknown }).results)
      ? ((json as { results: unknown[] }).results ?? [])
      : [];

  return results
    .map((result) => {
      const record = typeof result === 'object' && result !== null ? (result as Record<string, unknown>) : {};
      const url = String(record.url ?? '');
      const title = String(record.title ?? '');
      const snippet = String(record.content ?? record.snippet ?? '');
      const domain = safeDomainFromUrl(url) || String(record.domain ?? '');
      return { title, url, snippet, domain } as WebSearchResult;
    })
    .filter((result) => result.title && result.url && isHttpsUrl(result.url));
}

function buildResourceReasons(params: {
  resourceUrl: string;
  topTags: Array<{ tag: string; count: number }>;
  topicTagsUsed: string[];
}): string[] {
  const reasons: string[] = [];

  for (const tag of params.topTags) {
    if (STUB_RESOURCES_BY_TAG[tag.tag]?.some((resource) => resource.url === params.resourceUrl)) {
      reasons.push(`matched tag: ${tag.tag}`);
      reasons.push(`you have ${tag.count} document(s) tagged ${tag.tag}`);
    }
  }

  if (reasons.length === 0 && params.topicTagsUsed.length > 0) {
    reasons.push(`matched tag: ${params.topicTagsUsed[0]}`);
  }

  return reasons;
}

export async function buildStubLearningBrief(scope: WorkspaceScope): Promise<LearningBrief> {
  const topTags = await getTopTags(scope, 2);
  const topicTagsUsed = topTags.map((tag) => tag.tag);
  const candidates = topicTagsUsed.flatMap((tag) => STUB_RESOURCES_BY_TAG[tag] ?? []);
  const picked: Array<(typeof candidates)[number]> = [];
  const seenUrl = new Set<string>();

  const pickType = (type: 'article' | 'book' | 'course'): void => {
    const item = candidates.find((candidate) => candidate.type === type && !seenUrl.has(candidate.url));
    if (!item) {
      return;
    }

    seenUrl.add(item.url);
    picked.push(item);
  };

  pickType('article');
  pickType('book');
  pickType('course');

  for (const candidate of candidates) {
    if (picked.length >= 3) {
      break;
    }
    if (seenUrl.has(candidate.url)) {
      continue;
    }

    seenUrl.add(candidate.url);
    picked.push(candidate);
  }

  const resources = picked.slice(0, 3).map((resource) => ({
    type: resource.type,
    title: resource.title,
    url: resource.url,
    domain: resource.domain,
    whyThisMatches: buildResourceReasons({
      resourceUrl: resource.url,
      topTags,
      topicTagsUsed,
    }),
    source: 'stub' as const,
  }));

  return {
    topicTagsUsed,
    resources,
  };
}

export async function buildWebLearningBrief(scope: WorkspaceScope): Promise<LearningBrief> {
  const topTags = await getTopTags(scope, 2);
  const topicTagsUsed = topTags.map((tag) => tag.tag);

  if (!process.env.TAVILY_API_KEY || topicTagsUsed.length === 0) {
    return buildStubLearningBrief(scope);
  }

  const tag = topicTagsUsed[0];
  const [articleResults, bookResults, courseResults] = await Promise.all([
    tavilySearch({
      query: `${tag} best guide`,
      maxResults: 8,
      searchDepth: 'basic',
    }),
    tavilySearch({
      query: `${tag} book`,
      maxResults: 8,
      searchDepth: 'basic',
      includeDomains: BOOK_DOMAIN_ALLOWLIST,
    }),
    tavilySearch({
      query: `${tag} course`,
      maxResults: 8,
      searchDepth: 'basic',
      includeDomains: COURSE_DOMAIN_ALLOWLIST,
    }),
  ]);

  const sortedArticles = [...articleResults].sort((left, right) => {
    const leftPreferred = ARTICLE_DOMAIN_PREFER.some((domain) => left.domain.endsWith(domain)) ? 1 : 0;
    const rightPreferred = ARTICLE_DOMAIN_PREFER.some((domain) => right.domain.endsWith(domain)) ? 1 : 0;
    return rightPreferred - leftPreferred;
  });

  const pickedArticle = pickTopUnique(sortedArticles, 1)[0];
  const pickedBook = pickTopUnique(bookResults, 1)[0];
  const pickedCourse = pickTopUnique(courseResults, 1)[0];
  const picked = [pickedArticle, pickedBook, pickedCourse].filter(Boolean) as WebSearchResult[];
  const fallbackPool = pickTopUnique([...sortedArticles, ...bookResults, ...courseResults], 10);

  for (const result of fallbackPool) {
    if (picked.length >= 3) {
      break;
    }
    if (picked.some((item) => item.url === result.url)) {
      continue;
    }

    picked.push(result);
  }

  const resources = picked.slice(0, 3).map((result, index) => {
    const type: 'article' | 'book' | 'course' =
      index === 0 ? 'article' : index === 1 ? 'book' : 'course';
    const reasons: string[] = [];
    const primary = topTags[0];

    if (primary) {
      reasons.push(`matched tag: ${primary.tag}`);
      reasons.push(`you have ${primary.count} document(s) tagged ${primary.tag}`);
    }

    return {
      type,
      title: result.title,
      url: result.url,
      domain: result.domain,
      whyThisMatches: reasons,
      source: 'web' as const,
    };
  });

  if (resources.length < 3) {
    return buildStubLearningBrief(scope);
  }

  return {
    topicTagsUsed,
    resources,
  };
}

export async function buildLearningBrief(scope: WorkspaceScope): Promise<LearningBrief> {
  if (process.env.TAVILY_API_KEY) {
    return buildWebLearningBrief(scope);
  }

  return buildStubLearningBrief(scope);
}
