'use server';

import { client, ensureSchema } from '@/db';
import { ingestDocument } from '@/server/services/ingest.service';

export async function saveToLibraryAction(text: string, title?: string) {
  try {
    // Ensure database schema is initialized
    await ensureSchema(client);

    // Use the title provided or default to 'Saved from chat'
    const documentTitle = title || 'Saved from chat';

    // Call the ingest service
    const result = await ingestDocument({
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
      error: error instanceof Error ? error.message : 'Failed to save text to library',
    };
  }
}
