'use server';

import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { publicErrorMessage } from '@/server/security/publicError';
import {
  IngestWorkflowError,
  ingestPreparedContent,
} from '@/server/services/ingestWorkflow.service';

export async function saveToLibraryAction(text: string, title?: string) {
  try {
    const scope = await requireSessionWorkspace();
    // Use the title provided or default to 'Saved from chat'
    const documentTitle = title?.trim() || 'Saved from chat';

    const result = await ingestPreparedContent({
      workspaceId: scope.workspaceId,
      title: documentTitle,
      source: 'chat',
      content: text,
      missingContentMessage: 'Content is required',
    });

    return {
      success: true,
      documentId: result.documentId,
      chunks: 1, // TODO: Implement chunking
      title: documentTitle,
      created: result.created,
    };
  } catch (error) {
    if (error instanceof IngestWorkflowError) {
      return {
        success: false,
        error: error.message,
      };
    }

    console.error('Failed to save to library:', error);
    return {
      success: false,
      error: publicErrorMessage(error, 'Failed to save text to library'),
    };
  }
}
