'use server';

import { ingestDocument } from '@/server/services/ingest.service';
import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { publicErrorMessage } from '@/server/security/publicError';

export async function saveToLibraryAction(text: string, title?: string) {
  try {
    const scope = await requireSessionWorkspace();
    // Use the title provided or default to 'Saved from chat'
    const documentTitle = title || 'Saved from chat';

    // Call the ingest service
    const result = await ingestDocument({
      workspaceId: scope.workspaceId,
      title: documentTitle,
      source: 'chat',
      content: text,
    });

    return {
      success: true,
      documentId: result.documentId,
      chunks: 1, // TODO: Implement chunking
      title: documentTitle,
      created: result.created,
    };
  } catch (error) {
    console.error('Failed to save to library:', error);
    return {
      success: false,
      error: publicErrorMessage(error, 'Failed to save text to library'),
    };
  }
}
