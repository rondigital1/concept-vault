import { assertTrustedSource } from '@/server/security/sourceTrust';
import { tavilyExtract } from '@/server/tools/tavily.tool';
import {
  extractArticleContent,
  isHighConfidenceArticle,
  MIN_EXTRACTED_CONTENT_LENGTH,
} from '@/server/services/urlExtractArticleParser';
import {
  assertPublicUrl,
  fetchValidatedResponse,
  isHttpUrl,
  readResponseTextWithLimit,
} from '@/server/services/urlExtractNetwork.service';
import {
  deriveTitleFromText,
  resolveArticleTitle,
} from '@/server/services/urlExtractTitle.service';
import type { UrlExtractionResult } from '@/server/services/urlExtract.types';

export type { UrlExtractionResult };
export { isHttpUrl };

export async function extractDocumentFromUrl(url: string): Promise<UrlExtractionResult> {
  if (!isHttpUrl(url)) {
    throw new Error('source must be a valid http(s) URL');
  }

  await assertPublicUrl(url);

  const fetchExtraction = await tryExtractWithFetch(url);
  if (fetchExtraction && isHighConfidenceArticle(fetchExtraction.content)) {
    return finalizeTrustedExtraction(url, fetchExtraction);
  }

  const tavilyExtraction = await tryExtractWithTavily(url);
  if (tavilyExtraction && isHighConfidenceArticle(tavilyExtraction.content)) {
    return finalizeTrustedExtraction(url, tavilyExtraction);
  }

  throw new Error('Could not confidently extract main article content from URL');
}

async function finalizeTrustedExtraction(
  url: string,
  extraction: UrlExtractionResult,
): Promise<UrlExtractionResult> {
  const resolvedTitle = await resolveArticleTitle(url, extraction.title, extraction.content);
  assertTrustedSource({
    context: 'url_extract',
    url,
    title: resolvedTitle,
    content: extraction.content,
  });

  return {
    ...extraction,
    title: resolvedTitle,
  };
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
  const response = await fetchValidatedResponse(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch URL (${response.status})`);
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const body = await readResponseTextWithLimit(response);

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
