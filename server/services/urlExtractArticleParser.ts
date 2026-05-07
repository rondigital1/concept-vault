import { extractBestHtmlTitle } from '@/server/services/urlExtractTitle.service';
import {
  normalizeExtractedText,
  normalizeWhitespace,
  stripHtml,
} from '@/server/services/urlExtractTextNormalization';

export const MIN_EXTRACTED_CONTENT_LENGTH = 50;

const ARTICLE_CLASS_HINTS =
  'article|post|entry|story|article-body|post-content|entry-content|main-content|read-content';
const BOILERPLATE_CLASS_HINTS =
  'nav|menu|footer|sidebar|breadcrumb|share|social|comment|related|promo|banner|subscribe|newsletter|cookie|modal|popup|toolbar';
const NOISE_TERMS_REGEX =
  /\b(related|recommended|trending|latest|popular|advertisement|sponsored|newsletter|subscribe|cookie|privacy|terms|all rights reserved|share|follow us|you may also like)\b/gi;
const MIN_ARTICLE_WORDS = 25;
const MIN_ARTICLE_SENTENCES = 2;

export function extractArticleContent(raw: string, contentType?: string): { title?: string; content: string } {
  const input = raw.trim();
  if (!input) {
    return { content: '' };
  }

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
    'gi',
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
    if (!parsed) {
      continue;
    }

    const articleBody = findArticleBody(parsed);
    if (articleBody) {
      return normalizeExtractedText(articleBody);
    }
  }

  return null;
}

function findArticleBody(node: unknown): string | null {
  if (!node) {
    return null;
  }
  if (typeof node === 'string') {
    return null;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findArticleBody(item);
      if (found) {
        return found;
      }
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
      if (found) {
        return found;
      }
    }
    for (const value of Object.values(record)) {
      const found = findArticleBody(value);
      if (found) {
        return found;
      }
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

function stripBoilerplateBlocks(html: string): string {
  let cleaned = html;
  const removableTags = [
    'script',
    'style',
    'noscript',
    'template',
    'svg',
    'canvas',
    'iframe',
    'nav',
    'header',
    'footer',
    'aside',
    'form',
  ];

  for (const tag of removableTags) {
    const pattern = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    cleaned = cleaned.replace(pattern, ' ');
  }

  cleaned = cleaned.replace(
    new RegExp(
      `<([a-z0-9]+)\\b[^>]*(?:id|class)\\s*=\\s*["'][^"']*(${BOILERPLATE_CLASS_HINTS})[^"']*["'][^>]*>[\\s\\S]*?<\\/\\1>`,
      'gi',
    ),
    ' ',
  );

  return cleaned;
}

function extractArticleFromPlain(value: string): string {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return '';
  }

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

  const bestSingle = scored.sort((left, right) => right.score - left.score)[0];
  if (bestSingle?.score > 0 && isLikelyNarrative(bestSingle.text)) {
    return bestSingle.text;
  }

  return '';
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

  if (words < 35) {
    score -= 100;
  }
  if (sentences < 2) {
    score -= 60;
  }
  if (links > 0 && words / Math.max(links, 1) < 30) {
    score -= 80;
  }

  return score;
}

function chooseBestContiguousRun(
  blocks: Array<{ index: number; text: string; score: number }>,
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
    if (text.length < MIN_EXTRACTED_CONTENT_LENGTH || !isLikelyNarrative(text)) {
      continue;
    }

    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const paragraphCount = text.split(/\n{2,}/).filter((paragraph) => paragraph.trim().length > 120).length;
    const sentenceCount = text.split(/[.!?]\s/).filter((sentence) => sentence.trim().length > 20).length;
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
  if (!text) {
    return false;
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  const sentences = (text.match(/[.!?](?:\s|$)/g) ?? []).length;
  const urlCount = (text.match(/https?:\/\/\S+/gi) ?? []).length;
  const noisyTerms = (text.match(NOISE_TERMS_REGEX) ?? []).length;

  if (words < MIN_ARTICLE_WORDS) {
    return false;
  }
  if (sentences < 1 && words < 60) {
    return false;
  }
  if (urlCount >= 3 && words / Math.max(urlCount, 1) < 40) {
    return false;
  }
  if (noisyTerms > 4) {
    return false;
  }

  return true;
}

export function isHighConfidenceArticle(text: string): boolean {
  if (!isLikelyNarrative(text)) {
    return false;
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  const sentences = (text.match(/[.!?](?:\s|$)/g) ?? []).length;
  const paragraphCount = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length >= 80).length;
  const urlCount = (text.match(/https?:\/\/\S+/gi) ?? []).length;
  const noisyTerms = (text.match(NOISE_TERMS_REGEX) ?? []).length;

  if (words < MIN_ARTICLE_WORDS) {
    return false;
  }
  if (sentences < MIN_ARTICLE_SENTENCES && paragraphCount < 2) {
    return false;
  }
  if (urlCount > Math.max(3, Math.floor(words / 80))) {
    return false;
  }
  if (noisyTerms > Math.max(3, Math.floor(words / 120))) {
    return false;
  }

  return true;
}
