'use server';

import { client, ensureSchema } from '@/db';
import {
  deleteDocument,
  updateDocumentTitle,
} from '@/server/services/document.service';
import { toggleFavorite } from '@/server/repos/documents.repo';
import { revalidatePath } from 'next/cache';

export async function deleteDocumentAction(documentId: string) {
  try {
    await ensureSchema(client);
    await deleteDocument(documentId);
    revalidatePath('/library');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete document',
    };
  }
}

export async function updateDocumentTitleAction(
  documentId: string,
  title: string
) {
  try {
    await ensureSchema(client);
    await updateDocumentTitle(documentId, title);
    revalidatePath('/library');
    revalidatePath(`/library/${documentId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update document title:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update title',
    };
  }
}

export async function toggleFavoriteAction(documentId: string) {
  try {
    await ensureSchema(client);
    const isFavorite = await toggleFavorite(documentId);
    revalidatePath('/library');
    return { success: true, isFavorite };
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle favorite',
    };
  }
}
