'use server';

import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import {
  IngestWorkflowError,
  ingestTextOrUrl,
} from '@/server/services/ingestWorkflow.service';

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
    const result = await ingestTextOrUrl({
      workspaceId: scope.workspaceId,
      title: formData.title,
      source: formData.source,
      content: formData.content,
      context: 'ingest_action',
      missingNonUrlContentMessage: 'Content is required for non-URL sources',
      missingContentMessage: 'Content is required',
      shortContentMessage: 'Content must be at least 50 characters',
    });

    return {
      success: true,
      documentId: result.documentId,
      created: result.created,
    };
  } catch (error: unknown) {
    if (error instanceof IngestWorkflowError) {
      return {
        success: false,
        error: error.message,
      };
    }
    console.error('Ingest error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to ingest content',
    };
  }
}
