import { tavilyExtract } from '@/server/tools/tavily.tool';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MIN_EXTRACTED_CONTENT_LENGTH = 50;
const FETCH_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const ARTICLE_CLASS_HINTS =
  'article|post|entry|story|article-body|post-content|entry-content|main-content|read-content';
const BOILERPLATE_CLASS_HINTS =
  'nav|menu|footer|sidebar|breadcrumb|share|social|comment|related|promo|banner|subscribe|newsletter|cookie|modal|popup|toolbar';
const BOILERPLATE_LINE_PATTERNS: RegExp[] = [
  /^(home|about|contact|menu|search)$/i,
  /^(log in|login|sign in|sign up|subscribe)$/i,
  /^(privacy policy|terms|cookie policy|cookie settings)$/i,
  /^(read more|related articles?|share|print)$/i,
  /^skip to (main )?content$/i,
  /^https?:\/\/\S+$/i,
];
const NOISE_TERMS_REGEX =
  /\b(related|recommended|trending|latest|popular|advertisement|sponsored|newsletter|subscribe|cookie|privacy|terms|all rights reserved|share|follow us|you may also like)\b/gi;
const NOISE_TERMS_SINGLE_REGEX =
  /\b(related|recommended|trending|latest|popular|advertisement|sponsored|newsletter|subscribe|cookie|privacy|terms|all rights reserved|share|follow us|you may also like)\b/i;
const BAD_TITLE_PATTERNS: RegExp[] = [
  /^https?:\/\//i,
  /^[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?$/i,
  /^www\./i,
  /^untitled$/i,
  /^home$/i,
];
const MIN_ARTICLE_WORDS = 25;
const MIN_ARTICLE_SENTENCES = 2;

export type UrlExtractionResult = {
  title?: string;
  content: string;
  method: 'tavily' | 'fetch';
};

export function isHttpUrl(value: string | undefined | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split('.').map((part) => Number(part));
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return true;
  }

  const [a, b] = octets;

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 0) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;

  return false;
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  if (normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe80')) return true;
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.replace('::ffff:', '');
    return isPrivateIpv4(mapped);
  }

  return false;
}

function isPrivateIpAddress(address: string): boolean {
  const ipVersion = isIP(address);
  if (ipVersion === 4) {
    return isPrivateIpv4(address);
  }
  if (ipVersion === 6) {
    return isPrivateIpv6(address);
  }

  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized === 'host.docker.internal' ||
    normalized.endsWith('.local')
  );
}

async function assertPublicUrl(url: string): Promise<void> {
  const parsed = new URL(url);
  const hostname = parsed.hostname;

  if (isBlockedHostname(hostname)) {
    throw new Error('Refusing to fetch local or private network addresses');
  }

  if (isPrivateIpAddress(hostname)) {
    throw new Error('Refusing to fetch private IP addresses');
  }

  try {
    const addresses = await lookup(hostname, { all: true });
    if (addresses.some((entry) => isPrivateIpAddress(entry.address))) {
      throw new Error('Refusing to fetch hostnames resolving to private IP addresses');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Refusing to fetch')) {
      throw error;
    }

    throw new Error('Could not resolve URL host');
  }
}

export async function extractDocumentFromUrl(url: string): Promise<UrlExtractionResult> {
  if (!isHttpUrl(url)) {
    throw new Error('source must be a valid http(s) URL');
  }

  await assertPublicUrl(url);

  // Prefer direct HTML extraction so we can isolate article-only containers.
  const fetchExtraction = await tryExtractWithFetch(url);
  if (fetchExtraction && isHighConfidenceArticle(fetchExtraction.content)) {
    const resolvedTitle = await resolveArticleTitle(url, fetchExtraction.title, fetchExtraction.content);
    return {
      ...fetchExtraction,
      title: resolvedTitle,
    };
  }

  // Fallback for pages where fetch returns shell markup / blocked content.
  const tavilyExtraction = await tryExtractWithTavily(url);
  if (tavilyExtraction && isHighConfidenceArticle(tavilyExtraction.content)) {
    const resolvedTitle = await resolveArticleTitle(url, tavilyExtraction.title, tavilyExtraction.content);
    return {
      ...tavilyExtraction,
      title: resolvedTitle,
    };
  }

  throw new Error('Could not confidently extract main article content from URL');
}

async function tryExtractWithTavily(url: string): Promise<UrlExtractionResult | null> {
  try {
    const extraction = await tavilyExtract([url]);
    const extracted = extraction.results.find((item) => item.url === url) ?? extraction.results[0];
    const parsed = extractArticleContent(extracted?.rawContent ?? '');
    const content = parsed.content;

    if (content.length < MIN_EXTRACTED_CONTENT_LENGTH) {
      return null;
    }

    return {
      title: parsed.title || deriveTitleFromText(content),
      content,
      method: 'tavily',
    };
  } catch {
    return null;
  }
}

async function tryExtractWithFetch(url: string): Promise<UrlExtractionResult | null> {
  try {
    return await extractWithFetch(url);
  } catch {
    return null;
  }
}

async function extractWithFetch(url: string): Promise<UrlExtractionResult> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': FETCH_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL (${response.status})`);
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const body = await response.text();

  if (!body.trim()) {
    throw new Error('Fetched URL returned empty content');
  }
  const parsed = extractArticleContent(body, contentType);
  const content = parsed.content;

  return {
    title: parsed.title || deriveTitleFromText(content),
    content,
    method: 'fetch',
  };
}

async function resolveArticleTitle(
  url: string,
  candidateTitle: string | undefined,
  content: string
): Promise<string> {
  const fromCandidate = sanitizeTitle(candidateTitle, url);
  if (fromCandidate) return fromCandidate;

  const fetchedTitle = await tryExtractTitleFromUrl(url);
  const fromFetched = sanitizeTitle(fetchedTitle, url);
  if (fromFetched) return fromFetched;

  const fromContent = sanitizeTitle(deriveTitleFromText(content), url);
  if (fromContent) return fromContent;

  return deriveFallbackTitleFromUrl(url);
}

async function tryExtractTitleFromUrl(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': FETCH_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!response.ok) return undefined;

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('text/html')) return undefined;

    const html = await response.text();
    return extractBestHtmlTitle(html);
  } catch {
    return undefined;
  }
}

function extractArticleContent(raw: string, contentType?: string): { title?: string; content: string } {
  const input = raw.trim();
  if (!input) return { content: '' };

  const isHtml =
    contentType?.includes('text/html') ||
    /<html[\s>]/i.test(input) ||
    /<body[\s>]/i.test(input) ||
    /<article[\s>]/i.test(input);

  if (!isHtml) {
    return { content: extractArticleFromPlain(input) };
  }

  return extractArticleFromHtml(input);
}

function extractArticleFromHtml(html: string): { title?: string; content: string } {
  const title = extractBestHtmlTitle(html);
  const cleanedHtml = stripBoilerplateBlocks(html);

  const candidates: string[] = [];
  const jsonLdBody = extractArticleBodyFromJsonLd(cleanedHtml);
  if (jsonLdBody) {
    candidates.push(jsonLdBody);
  }

  candidates.push(...collectTagCandidates(cleanedHtml, 'article'));
  candidates.push(...collectTagCandidates(cleanedHtml, 'main'));
  candidates.push(...collectClassHintCandidates(cleanedHtml));

  const content = chooseBestArticleCandidate(candidates);
  return { title, content };
}

function collectTagCandidates(html: string, tagName: 'article' | 'main'): string[] {
  const regex = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  const results: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const text = extractArticleFromPlain(stripHtml(match[1]));
    if (text.length >= MIN_EXTRACTED_CONTENT_LENGTH && isLikelyNarrative(text)) {
      results.push(text);
    }
  }

  return results;
}

function collectClassHintCandidates(html: string): string[] {
  const regex = new RegExp(
    `<(section|div)\\b[^>]*(?:id|class)\\s*=\\s*["'][^"']*(${ARTICLE_CLASS_HINTS})[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`,
    'gi'
  );
  const results: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const text = extractArticleFromPlain(stripHtml(match[3]));
    if (text.length >= MIN_EXTRACTED_CONTENT_LENGTH && isLikelyNarrative(text)) {
      results.push(text);
    }
  }

  return results;
}

function extractArticleBodyFromJsonLd(html: string): string | null {
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const parsed = safeJsonParse(match[1].trim());
    if (!parsed) continue;

    const articleBody = findArticleBody(parsed);
    if (articleBody) {
      return normalizeExtractedText(articleBody);
    }
  }

  return null;
}

function findArticleBody(node: unknown): string | null {
  if (!node) return null;
  if (typeof node === 'string') return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findArticleBody(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof node === 'object') {
    const record = node as Record<string, unknown>;
    if (typeof record.articleBody === 'string' && record.articleBody.trim().length > 0) {
      return record.articleBody;
    }
    if (Array.isArray(record['@graph'])) {
      const found = findArticleBody(record['@graph']);
      if (found) return found;
    }
    for (const value of Object.values(record)) {
      const found = findArticleBody(value);
      if (found) return found;
    }
  }

  return null;
}

function safeJsonParse(input: string): unknown | null {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function extractBestHtmlTitle(html: string): string | undefined {
  const candidates: Array<{ value: string; weight: number }> = [];

  const ogTitle = extractMetaContent(html, 'property', 'og:title');
  if (ogTitle) candidates.push({ value: ogTitle, weight: 120 });

  const twitterTitle = extractMetaContent(html, 'name', 'twitter:title');
  if (twitterTitle) candidates.push({ value: twitterTitle, weight: 100 });

  const h1 = extractFirstTagText(html, 'h1');
  if (h1) candidates.push({ value: h1, weight: 90 });

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
    if (!normalized) continue;

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
    'i'
  );
  const reverseRegex = new RegExp(
    `<meta\\b[^>]*content\\s*=\\s*["']([\\s\\S]*?)["'][^>]*${attrName}\\s*=\\s*["']${escaped}["'][^>]*>`,
    'i'
  );

  const match = html.match(regex) ?? html.match(reverseRegex);
  return match?.[1] ? decodeHtmlEntities(match[1]) : undefined;
}

function extractFirstTagText(html: string, tag: string): string | undefined {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!match?.[1]) return undefined;

  const text = stripHtml(match[1]);
  return normalizeWhitespace(decodeHtmlEntities(text)) || undefined;
}

function extractTagInnerText(html: string, tag: string): string | undefined {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!match?.[1]) return undefined;
  return normalizeWhitespace(decodeHtmlEntities(match[1])) || undefined;
}

function splitTitleCandidates(value: string): string[] {
  const separators = [' | ', ' - ', ' — ', ' · ', ' :: '];
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) return [];

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
  if (words < 2) score -= 60;
  if (words > 18) score -= 40;
  if (title.length < 8) score -= 60;
  if (hasBadTitlePattern(title)) score -= 300;
  if (NOISE_TERMS_SINGLE_REGEX.test(title)) score -= 160;
  if (/^[^a-zA-Z]*$/.test(title)) score -= 140;

  return score;
}

function sanitizeTitle(value: string | undefined, sourceUrl: string): string | undefined {
  if (!value) return undefined;

  const normalized = normalizeTitleText(value);
  if (!normalized) return undefined;
  if (hasBadTitlePattern(normalized)) return undefined;

  const sourceHost = safeHost(sourceUrl);
  const candidateHost = safeHost(normalized);
  if (sourceHost && candidateHost && sourceHost === candidateHost) return undefined;

  return normalized;
}

function hasBadTitlePattern(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) return true;

  if (BAD_TITLE_PATTERNS.some((pattern) => pattern.test(normalized))) return true;

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripBoilerplateBlocks(html: string): string {
  let cleaned = html;
  const removableTags = ['script', 'style', 'noscript', 'template', 'svg', 'canvas', 'iframe', 'nav', 'header', 'footer', 'aside', 'form'];

  for (const tag of removableTags) {
    const pattern = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    cleaned = cleaned.replace(pattern, ' ');
  }

  cleaned = cleaned.replace(
    new RegExp(
      `<([a-z0-9]+)\\b[^>]*(?:id|class)\\s*=\\s*["'][^"']*(${BOILERPLATE_CLASS_HINTS})[^"']*["'][^>]*>[\\s\\S]*?<\\/\\1>`,
      'gi'
    ),
    ' '
  );

  return cleaned;
}

function stripHtml(html: string): string {
  let cleaned = html;
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  cleaned = cleaned.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  cleaned = cleaned.replace(/<template[\s\S]*?<\/template>/gi, ' ');
  cleaned = cleaned.replace(/<\/(p|div|section|article|li|ul|ol|h[1-6]|tr)>/gi, '\n');
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  cleaned = decodeHtmlEntities(cleaned);
  return cleaned;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function normalizeExtractedText(value: string): string {
  return filterBoilerplateLines(normalizeWhitespace(value));
}

function filterBoilerplateLines(value: string): string {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (BOILERPLATE_LINE_PATTERNS.some((pattern) => pattern.test(line))) return false;
      if (/^(?:\w+\s*\|\s*){2,}\w+$/i.test(line)) return false;
      if (/^(?:[a-z][a-z0-9-]{1,20}\s+){4,}[a-z][a-z0-9-]{1,20}$/i.test(line)) return false;

      const urlMatches = line.match(/https?:\/\/\S+/gi) ?? [];
      if (urlMatches.length >= 2 && line.length < 240) return false;

      return true;
    });

  return lines.join('\n').trim();
}

function extractArticleFromPlain(value: string): string {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return '';

  const blocks = normalized
    .split(/\n{2,}/)
    .map((block, index) => ({ index, text: normalizeExtractedText(block) }))
    .filter((block) => block.text.length > 0);

  if (blocks.length === 0) {
    return '';
  }

  const scored = blocks.map((block) => ({
    ...block,
    score: scorePlainTextBlock(block.text),
  }));

  const bestRun = chooseBestContiguousRun(scored);
  if (bestRun) {
    return bestRun;
  }

  const bestSingle = scored.sort((a, b) => b.score - a.score)[0];
  return bestSingle?.score > 0 && isLikelyNarrative(bestSingle.text) ? bestSingle.text : '';
}

function scorePlainTextBlock(block: string): number {
  const words = block.split(/\s+/).filter(Boolean).length;
  const sentences = (block.match(/[.!?](?:\s|$)/g) ?? []).length;
  const links = (block.match(/https?:\/\/\S+/gi) ?? []).length;
  const noisyTerms = (block.match(NOISE_TERMS_REGEX) ?? []).length;
  const shortLines = block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.length < 45).length;

  let score = words * 2 + sentences * 18 - links * 70 - noisyTerms * 130 - shortLines * 7;

  if (words < 35) score -= 100;
  if (sentences < 2) score -= 60;
  if (links > 0 && words / Math.max(links, 1) < 30) score -= 80;

  return score;
}

function chooseBestContiguousRun(
  blocks: Array<{ index: number; text: string; score: number }>
): string {
  let bestScore = -Infinity;
  let bestText = '';
  let currentScore = 0;
  let currentBlocks: string[] = [];
  let currentStartIndex = 0;
  let previousIndex = -2;

  for (const block of blocks) {
    const isStrong = block.score >= 40;
    const isAdjacent = block.index === previousIndex + 1;

    if (!isStrong) {
      if (currentBlocks.length > 0) {
        const candidate = currentBlocks.join('\n\n');
        const candidateScore = currentScore + candidate.length * 0.02 - currentStartIndex * 12;
        if (candidateScore > bestScore) {
          bestScore = candidateScore;
          bestText = candidate;
        }
      }
      currentBlocks = [];
      currentScore = 0;
      previousIndex = block.index;
      continue;
    }

    if (!isAdjacent && currentBlocks.length > 0) {
      const candidate = currentBlocks.join('\n\n');
      const candidateScore = currentScore + candidate.length * 0.02 - currentStartIndex * 12;
      if (candidateScore > bestScore) {
        bestScore = candidateScore;
        bestText = candidate;
      }
      currentBlocks = [];
      currentScore = 0;
    }

    if (currentBlocks.length === 0) {
      currentStartIndex = block.index;
    }
    currentBlocks.push(block.text);
    currentScore += block.score;
    previousIndex = block.index;
  }

  if (currentBlocks.length > 0) {
    const candidate = currentBlocks.join('\n\n');
    const candidateScore = currentScore + candidate.length * 0.02 - currentStartIndex * 12;
    if (candidateScore > bestScore) {
      bestText = candidate;
    }
  }

  return bestText;
}

function chooseBestArticleCandidate(candidates: string[]): string {
  let best = '';
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const text = extractArticleFromPlain(candidate);
    if (text.length < MIN_EXTRACTED_CONTENT_LENGTH || !isLikelyNarrative(text)) continue;

    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const paragraphCount = text.split(/\n{2,}/).filter((p) => p.trim().length > 120).length;
    const sentenceCount = text.split(/[.!?]\s/).filter((s) => s.trim().length > 20).length;
    const urlCount = (text.match(/https?:\/\/\S+/gi) ?? []).length;
    const noisyTerms = (text.match(NOISE_TERMS_REGEX) ?? []).length;
    const shortLineCount = lines.filter((line) => line.length < 45).length;
    const score =
      text.length +
      paragraphCount * 240 +
      sentenceCount * 20 -
      urlCount * 200 -
      noisyTerms * 180 -
      shortLineCount * 8;

    if (score > bestScore) {
      best = text;
      bestScore = score;
    }
  }

  return best;
}

function isLikelyNarrative(text: string): boolean {
  if (!text) return false;

  const words = text.split(/\s+/).filter(Boolean).length;
  const sentences = (text.match(/[.!?](?:\s|$)/g) ?? []).length;
  const urlCount = (text.match(/https?:\/\/\S+/gi) ?? []).length;
  const noisyTerms = (text.match(NOISE_TERMS_REGEX) ?? []).length;

  if (words < MIN_ARTICLE_WORDS) return false;
  if (sentences < 1 && words < 60) return false;
  if (urlCount >= 3 && words / Math.max(urlCount, 1) < 40) return false;
  if (noisyTerms > 4) return false;

  return true;
}

function isHighConfidenceArticle(text: string): boolean {
  if (!isLikelyNarrative(text)) return false;

  const words = text.split(/\s+/).filter(Boolean).length;
  const sentences = (text.match(/[.!?](?:\s|$)/g) ?? []).length;
  const paragraphCount = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 80).length;
  const urlCount = (text.match(/https?:\/\/\S+/gi) ?? []).length;
  const noisyTerms = (text.match(NOISE_TERMS_REGEX) ?? []).length;

  if (words < MIN_ARTICLE_WORDS) return false;
  if (sentences < MIN_ARTICLE_SENTENCES && paragraphCount < 2) return false;
  if (urlCount > Math.max(3, Math.floor(words / 80))) return false;
  if (noisyTerms > Math.max(3, Math.floor(words / 120))) return false;

  return true;
}

function deriveTitleFromText(content: string): string {
  const firstLine =
    content
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? 'Untitled';

  return firstLine.slice(0, 200);
}
