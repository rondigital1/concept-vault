'use server';

import { client, ensureSchema } from '@/db';
import {
  createCollection,
  updateCollection,
  deleteCollection,
  addDocumentToCollection,
  removeDocumentFromCollection,
} from '@/server/repos/collections.repo';
import { revalidatePath } from 'next/cache';

export async function createCollectionAction(name: string, description?: string) {
  try {
    await ensureSchema(client);
    const id = await createCollection(name, description);
    revalidatePath('/library');
    return { success: true, id };
  } catch (error) {
    console.error('Failed to create collection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create collection',
    };
  }
}

export async function renameCollectionAction(collectionId: string, name: string) {
  try {
    await ensureSchema(client);
    await updateCollection(collectionId, { name });
    revalidatePath('/library');
    return { success: true };
  } catch (error) {
    console.error('Failed to rename collection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rename collection',
    };
  }
}

export async function deleteCollectionAction(collectionId: string) {
  try {
    await ensureSchema(client);
    await deleteCollection(collectionId);
    revalidatePath('/library');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete collection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete collection',
    };
  }
}

export async function addToCollectionAction(
  collectionId: string,
  documentId: string,
) {
  try {
    await ensureSchema(client);
    await addDocumentToCollection(collectionId, documentId);
    revalidatePath('/library');
    return { success: true };
  } catch (error) {
    console.error('Failed to add to collection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add to collection',
    };
  }
}

export async function removeFromCollectionAction(
  collectionId: string,
  documentId: string,
) {
  try {
    await ensureSchema(client);
    await removeDocumentFromCollection(collectionId, documentId);
    revalidatePath('/library');
    return { success: true };
  } catch (error) {
    console.error('Failed to remove from collection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove from collection',
    };
  }
}
