'use server';

import { ingestDocument } from '@/server/services/ingest.service';
import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { assertTrustedSource } from '@/server/security/sourceTrust';
import { extractDocumentFromUrl, isHttpUrl } from '@/server/services/urlExtract.service';

export type IngestResult =
  | { success: true; documentId: string; created: boolean }
  | { success: false; error: string };

export async function ingestContent(formData: {
  title?: string;
  source?: string;
  content?: string;
}): Promise<IngestResult> {
  try {
    const scope = await requireSessionWorkspace();
    const rawSource = formData.source?.trim();
    const source = rawSource || 'manual';
    const providedContent = formData.content?.trim() || '';
    let content = providedContent;
    let extractedTitle: string | undefined;

    const shouldExtractFromUrl = isHttpUrl(rawSource) && content.length < 50;

    if (isHttpUrl(rawSource) && !shouldExtractFromUrl) {
      assertTrustedSource({
        context: 'ingest_action',
        url: rawSource,
        title: formData.title,
        content,
      });
    }

    if (shouldExtractFromUrl) {
      const extraction = await extractDocumentFromUrl(rawSource);
      content = extraction.content;
      extractedTitle = extraction.title;
    } else if (!content) {
      if (!isHttpUrl(rawSource)) {
        return { success: false, error: 'Content is required for non-URL sources' };
      }
    }

    // Validation
    if (!content) {
      return { success: false, error: 'Content is required' };
    }

    if (content.length < 50) {
      return { success: false, error: 'Content must be at least 50 characters' };
    }

    // Derive title from content if not provided
    const title = formData.title?.trim() || extractedTitle || deriveTitle(content);

    // Call the ingest service
    const result = await ingestDocument({
      workspaceId: scope.workspaceId,
      title,
      source,
      content,
    });

    return {
      success: true,
      documentId: result.documentId,
      created: result.created,
    };
  } catch (error: unknown) {
    console.error('Ingest error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to ingest content',
    };
  }
}

function deriveTitle(content: string): string {
  const firstLine = content
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0) || 'Untitled';

  return firstLine.slice(0, 200);
}
