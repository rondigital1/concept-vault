import {
  decodeHtmlEntities,
  escapeRegExp,
  normalizeWhitespace,
  stripHtml,
} from '@/server/services/urlExtractTextNormalization';
import {
  fetchValidatedResponse,
  readResponseTextWithLimit,
} from '@/server/services/urlExtractNetwork.service';

const NOISE_TERMS_SINGLE_REGEX =
  /\b(related|recommended|trending|latest|popular|advertisement|sponsored|newsletter|subscribe|cookie|privacy|terms|all rights reserved|share|follow us|you may also like)\b/i;
const BAD_TITLE_PATTERNS: RegExp[] = [
  /^https?:\/\//i,
  /^[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?$/i,
  /^www\./i,
  /^untitled$/i,
  /^home$/i,
];

export async function resolveArticleTitle(
  url: string,
  candidateTitle: string | undefined,
  content: string,
): Promise<string> {
  const fromCandidate = sanitizeTitle(candidateTitle, url);
  if (fromCandidate) {
    return fromCandidate;
  }

  const fetchedTitle = await tryExtractTitleFromUrl(url);
  const fromFetched = sanitizeTitle(fetchedTitle, url);
  if (fromFetched) {
    return fromFetched;
  }

  const fromContent = sanitizeTitle(deriveTitleFromText(content), url);
  if (fromContent) {
    return fromContent;
  }

  return deriveFallbackTitleFromUrl(url);
}

async function tryExtractTitleFromUrl(url: string): Promise<string | undefined> {
  try {
    const response = await fetchValidatedResponse(url);

    if (!response.ok) {
      return undefined;
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('text/html')) {
      return undefined;
    }

    const html = await readResponseTextWithLimit(response);
    return extractBestHtmlTitle(html);
  } catch {
    return undefined;
  }
}

export function extractBestHtmlTitle(html: string): string | undefined {
  const candidates: Array<{ value: string; weight: number }> = [];
  const ogTitle = extractMetaContent(html, 'property', 'og:title');

  if (ogTitle) {
    candidates.push({ value: ogTitle, weight: 120 });
  }

  const twitterTitle = extractMetaContent(html, 'name', 'twitter:title');
  if (twitterTitle) {
    candidates.push({ value: twitterTitle, weight: 100 });
  }

  const h1 = extractFirstTagText(html, 'h1');
  if (h1) {
    candidates.push({ value: h1, weight: 90 });
  }

  const titleTag = extractTagInnerText(html, 'title');
  if (titleTag) {
    const expanded = splitTitleCandidates(titleTag);
    for (const part of expanded) {
      candidates.push({ value: part, weight: 80 });
    }
  }

  let bestTitle: string | undefined;
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const normalized = normalizeTitleText(candidate.value);
    if (!normalized) {
      continue;
    }

    const score = candidate.weight + scoreTitleCandidate(normalized);
    if (score > bestScore) {
      bestScore = score;
      bestTitle = normalized;
    }
  }

  return bestTitle;
}

function extractMetaContent(html: string, attrName: 'name' | 'property', attrValue: string): string | undefined {
  const escaped = escapeRegExp(attrValue);
  const regex = new RegExp(
    `<meta\\b[^>]*${attrName}\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["']([\\s\\S]*?)["'][^>]*>`,
    'i',
  );
  const reverseRegex = new RegExp(
    `<meta\\b[^>]*content\\s*=\\s*["']([\\s\\S]*?)["'][^>]*${attrName}\\s*=\\s*["']${escaped}["'][^>]*>`,
    'i',
  );
  const match = html.match(regex) ?? html.match(reverseRegex);

  if (match?.[1]) {
    return decodeHtmlEntities(match[1]);
  }

  return undefined;
}

function extractFirstTagText(html: string, tag: string): string | undefined {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!match?.[1]) {
    return undefined;
  }

  const text = stripHtml(match[1]);
  return normalizeWhitespace(decodeHtmlEntities(text)) || undefined;
}

function extractTagInnerText(html: string, tag: string): string | undefined {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!match?.[1]) {
    return undefined;
  }

  return normalizeWhitespace(decodeHtmlEntities(match[1])) || undefined;
}

function splitTitleCandidates(value: string): string[] {
  const separators = [' | ', ' - ', ' — ', ' · ', ' :: '];
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) {
    return [];
  }

  const parts = [trimmed];
  for (const separator of separators) {
    if (trimmed.includes(separator)) {
      for (const piece of trimmed.split(separator)) {
        const normalized = normalizeWhitespace(piece);
        if (normalized) {
          parts.push(normalized);
        }
      }
    }
  }

  return Array.from(new Set(parts));
}

function normalizeTitleText(value: string): string {
  return normalizeWhitespace(decodeHtmlEntities(value)).replace(/\s+/g, ' ').trim().slice(0, 200);
}

function scoreTitleCandidate(title: string): number {
  let score = title.length;
  const words = title.split(/\s+/).filter(Boolean).length;

  if (words < 2) {
    score -= 60;
  }
  if (words > 18) {
    score -= 40;
  }
  if (title.length < 8) {
    score -= 60;
  }
  if (hasBadTitlePattern(title)) {
    score -= 300;
  }
  if (NOISE_TERMS_SINGLE_REGEX.test(title)) {
    score -= 160;
  }
  if (/^[^a-zA-Z]*$/.test(title)) {
    score -= 140;
  }

  return score;
}

function sanitizeTitle(value: string | undefined, sourceUrl: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeTitleText(value);
  if (!normalized) {
    return undefined;
  }
  if (hasBadTitlePattern(normalized)) {
    return undefined;
  }

  const sourceHost = safeHost(sourceUrl);
  const candidateHost = safeHost(normalized);
  if (sourceHost && candidateHost && sourceHost === candidateHost) {
    return undefined;
  }

  return normalized;
}

function hasBadTitlePattern(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) {
    return true;
  }

  if (BAD_TITLE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  const host = safeHost(normalized);
  if (host && normalized.toLowerCase().includes(host.toLowerCase()) && normalized.split(/\s+/).length <= 3) {
    return true;
  }

  return false;
}

function safeHost(value: string): string | null {
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function deriveFallbackTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const slug = parsed.pathname
      .split('/')
      .filter(Boolean)
      .at(-1)
      ?.replace(/[-_]+/g, ' ')
      ?.replace(/\.[a-z0-9]+$/i, '')
      ?.trim();

    if (slug && slug.length >= 6 && !/^\d+$/.test(slug)) {
      return slug.slice(0, 200);
    }

    return 'Untitled Article';
  } catch {
    return 'Untitled Article';
  }
}

export function deriveTitleFromText(content: string): string {
  const firstLine =
    content
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? 'Untitled';

  return firstLine.slice(0, 200);
}
