import { publicErrorMessage } from '@/server/security/publicError';
import { BlockedSourceError } from '@/server/security/sourceTrust';
import { extractDocumentFromUrl, isHttpUrl } from '@/server/services/urlExtract.service';
import {
  ingestPreparedContent,
  type IngestWorkflowResult,
} from '@/server/services/ingestWorkflow.service';

export type LibraryImportPayload =
  | {
      status: 'imported' | 'linked';
      documentId: string;
      created: boolean;
      enrichmentJobId: string | null;
      enrichmentQueued: boolean;
      enrichmentRunId: string | null;
    }
  | {
      status: 'failed';
      error: string;
    };

export type PreparedWebProposalImport = {
  content: string;
  title: string;
  url: string;
};

export function parseWebProposalUrl(content: unknown): string {
  if (!content || typeof content !== 'object') {
    return '';
  }

  const record = content as Record<string, unknown>;
  return typeof record.url === 'string' ? record.url.trim() : '';
}

export function hasValidWebProposalUrl(content: unknown): boolean {
  return isHttpUrl(parseWebProposalUrl(content));
}

export async function prepareWebProposalImport(artifact: {
  content: unknown;
  id: string;
  title: string;
}): Promise<PreparedWebProposalImport> {
  const url = parseWebProposalUrl(artifact.content);
  if (!isHttpUrl(url)) {
    throw new Error('Approved web proposal is missing a valid URL');
  }

  try {
    const extracted = await extractDocumentFromUrl(url);
    const titleFromExtraction =
      typeof extracted.title === 'string' && extracted.title.trim()
        ? extracted.title.trim()
        : '';
    return {
      url,
      title: titleFromExtraction || artifact.title || url,
      content: extracted.content,
    };
  } catch (importError) {
    if (importError instanceof BlockedSourceError) {
      throw importError;
    }

    const summaryFallback = parseWebProposalSummary(artifact.content);
    if (!summaryFallback) {
      throw importError;
    }

    console.warn(
      `[artifact-approve] URL extraction failed for ${artifact.id}; falling back to stored summary:`,
      publicErrorMessage(importError, 'Import failed'),
    );

    return {
      url,
      title: artifact.title || url,
      content: summaryFallback,
    };
  }
}

export async function importApprovedWebProposal(
  workspaceId: string,
  preparedImport: PreparedWebProposalImport,
): Promise<IngestWorkflowResult> {
  return ingestPreparedContent({
    workspaceId,
    title: preparedImport.title,
    source: preparedImport.url,
    content: preparedImport.content,
    autoEnrich: true,
    enableAutoDistill: false,
    titleMaxLength: 300,
    missingContentMessage: 'Approved web proposal content is empty',
  });
}

export function buildLibraryImportPayload(result: IngestWorkflowResult): LibraryImportPayload {
  return {
    status: result.created ? 'imported' : 'linked',
    documentId: result.documentId,
    created: result.created,
    enrichmentJobId: result.enrichmentJobId,
    enrichmentQueued: result.enrichmentQueued,
    enrichmentRunId: result.enrichmentRunId,
  };
}

export function buildFailedLibraryImportPayload(error: unknown): LibraryImportPayload {
  return {
    status: 'failed',
    error: publicErrorMessage(error, 'Library import failed'),
  };
}

function parseWebProposalSummary(content: unknown): string {
  if (!content || typeof content !== 'object') {
    return '';
  }

  const record = content as Record<string, unknown>;
  return typeof record.summary === 'string' ? record.summary.trim() : '';
}
