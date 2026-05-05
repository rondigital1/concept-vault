import {
  ingestDocument,
  type IngestDocumentResult,
} from '@/server/services/ingest.service';
import { publicErrorMessage } from '@/server/security/publicError';
import { assertTrustedSource } from '@/server/security/sourceTrust';
import { extractDocumentFromUrl, isHttpUrl } from '@/server/services/urlExtract.service';

export type IngestWorkflowResult = IngestDocumentResult & {
  title: string;
  source: string;
  contentLength: number;
};

export class IngestWorkflowError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'IngestWorkflowError';
  }
}

type PreparedIngestInput = {
  workspaceId: string;
  title?: string;
  source: string;
  content: string;
  autoEnrich?: boolean;
  enableAutoDistill?: boolean;
  minContentLength?: number;
  missingContentMessage?: string;
  shortContentMessage?: string;
  titleMaxLength?: number;
};

export async function ingestPreparedContent({
  workspaceId,
  title,
  source,
  content,
  autoEnrich,
  enableAutoDistill,
  minContentLength = 1,
  missingContentMessage = 'Content is required',
  shortContentMessage,
  titleMaxLength = 200,
}: PreparedIngestInput): Promise<IngestWorkflowResult> {
  const normalizedContent = content.trim();
  if (!normalizedContent) {
    throw new IngestWorkflowError(missingContentMessage);
  }

  if (normalizedContent.length < minContentLength) {
    throw new IngestWorkflowError(
      shortContentMessage ?? `Content must be at least ${minContentLength} characters`,
    );
  }

  const normalizedSource = source.trim() || 'manual';
  const resolvedTitle = resolveTitle(title, normalizedContent, titleMaxLength);
  const result = await ingestDocument({
    workspaceId,
    title: resolvedTitle,
    source: normalizedSource,
    content: normalizedContent,
    autoEnrich,
    enableAutoDistill,
  });

  return {
    ...result,
    title: resolvedTitle,
    source: normalizedSource,
    contentLength: normalizedContent.length,
  };
}

type TextOrUrlIngestInput = {
  workspaceId: string;
  title?: string;
  source?: string;
  content?: string;
  context: string;
  autoEnrich?: boolean;
  enableAutoDistill?: boolean;
  minContentLength?: number;
  sourceMaxLength?: number;
  titleMaxLength?: number;
  missingNonUrlContentMessage?: string;
  missingContentMessage?: string;
  shortContentMessage?: string;
};

export async function ingestTextOrUrl({
  workspaceId,
  title,
  source: sourceInput,
  content: contentInput,
  context,
  autoEnrich,
  enableAutoDistill,
  minContentLength = 50,
  sourceMaxLength = 500,
  titleMaxLength = 200,
  missingNonUrlContentMessage = 'content is required for non-URL sources',
  missingContentMessage = 'Content is required',
  shortContentMessage = 'content is too short (min 50 chars)',
}: TextOrUrlIngestInput): Promise<IngestWorkflowResult> {
  const source = sourceInput?.trim() ? sourceInput.trim().slice(0, sourceMaxLength) : 'manual';
  let content = contentInput?.trim() ?? '';
  let extractedTitle: string | undefined;
  const shouldExtractFromUrl = isHttpUrl(source) && content.length < minContentLength;

  if (isHttpUrl(source) && !shouldExtractFromUrl) {
    assertTrustedSource({
      context,
      url: source,
      title,
      content,
    });
  }

  if (shouldExtractFromUrl) {
    try {
      const extraction = await extractDocumentFromUrl(source);
      content = extraction.content;
      extractedTitle = extraction.title;
    } catch (error) {
      if (!content) {
        throw new IngestWorkflowError(
          publicErrorMessage(error, 'Failed to extract content from URL'),
        );
      }
    }
  } else if (!content && !isHttpUrl(source)) {
    throw new IngestWorkflowError(missingNonUrlContentMessage);
  }

  return ingestPreparedContent({
    workspaceId,
    title: title?.trim() || extractedTitle,
    source,
    content,
    autoEnrich,
    enableAutoDistill,
    minContentLength,
    missingContentMessage,
    shortContentMessage,
    titleMaxLength,
  });
}

export function buildIngestSuccessPayload(
  result: IngestDocumentResult,
  extra: Record<string, unknown> = {},
) {
  return {
    ok: true,
    documentId: result.documentId,
    created: result.created,
    enrichmentJobId: result.enrichmentJobId,
    enrichmentQueued: result.enrichmentQueued,
    enrichmentRunId: result.enrichmentRunId,
    ...extra,
  };
}

function resolveTitle(title: string | undefined, content: string, maxLength: number): string {
  const trimmedTitle = title?.trim();
  if (trimmedTitle) {
    return trimmedTitle.slice(0, maxLength);
  }

  return deriveTitleFromContent(content, maxLength);
}

function deriveTitleFromContent(content: string, maxLength: number): string {
  const firstLine =
    content
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? 'Untitled';

  return firstLine.slice(0, maxLength);
}
