import { extractSearchTerms } from '@/server/ai/tools/scoring.utils';

const HIGH_QUALITY_DOMAINS = new Set([
  'arxiv.org',
  'github.com',
  'stackoverflow.com',
  'wikipedia.org',
  'nature.com',
  'sciencedirect.com',
  'acm.org',
  'ieee.org',
  'mit.edu',
  'stanford.edu',
  'harvard.edu',
  'berkeley.edu',
  'medium.com',
  'dev.to',
  'towardsdatascience.com',
]);

const LOW_QUALITY_DOMAINS = new Set([
  'pinterest.com',
  'facebook.com',
  'tiktok.com',
  'instagram.com',
]);

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

function domainOf(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function computeWebScoutHeuristicScore(params: {
  goal: string;
  publishedDate?: string;
  snippet: string;
  title: string;
  url: string;
}): number {
  let score = 0.5;

  const domain = domainOf(params.url);
  if (HIGH_QUALITY_DOMAINS.has(domain) || domain.endsWith('.edu') || domain.endsWith('.gov')) {
    score += 0.2;
  }
  if (LOW_QUALITY_DOMAINS.has(domain)) {
    score -= 0.3;
  }
  // Social/forum domains get no bonus or penalty; they proceed to LLM evaluation on merit.

  const terms = extractSearchTerms(params.goal);
  const titleLower = params.title.toLowerCase();
  const snippetLower = params.snippet.toLowerCase();
  const matchCount = terms.filter((term) => {
    return titleLower.includes(term) || snippetLower.includes(term);
  }).length;
  const matchRatio = terms.length > 0 ? matchCount / terms.length : 0;
  score += matchRatio * 0.3;

  if (params.publishedDate) {
    const published = Date.parse(params.publishedDate);
    if (Number.isFinite(published) && Date.now() - published < SIX_MONTHS_MS) {
      score += 0.05;
    }
  }

  return Math.max(0, Math.min(1, score));
}
