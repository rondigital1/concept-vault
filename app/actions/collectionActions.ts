'use server';

import {
  createCollection,
  updateCollection,
  deleteCollection,
  addDocumentToCollection,
  removeDocumentFromCollection,
} from '@/server/repos/collections.repo';
import { revalidatePath } from 'next/cache';
import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { publicErrorMessage } from '@/server/security/publicError';

export async function createCollectionAction(name: string, description?: string) {
  try {
    const scope = await requireSessionWorkspace();
    const id = await createCollection(scope, name, description);
    revalidatePath('/library');
    return { success: true, id };
  } catch (error) {
    console.error('Failed to create collection:', error);
    return {
      success: false,
      error: publicErrorMessage(error, 'Failed to create collection'),
    };
  }
}

export async function renameCollectionAction(collectionId: string, name: string) {
  try {
    const scope = await requireSessionWorkspace();
    await updateCollection(scope, collectionId, { name });
    revalidatePath('/library');
    return { success: true };
  } catch (error) {
    console.error('Failed to rename collection:', error);
    return {
      success: false,
      error: publicErrorMessage(error, 'Failed to rename collection'),
    };
  }
}

export async function deleteCollectionAction(collectionId: string) {
  try {
    const scope = await requireSessionWorkspace();
    await deleteCollection(scope, collectionId);
    revalidatePath('/library');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete collection:', error);
    return {
      success: false,
      error: publicErrorMessage(error, 'Failed to delete collection'),
    };
  }
}

export async function addToCollectionAction(
  collectionId: string,
  documentId: string,
) {
  try {
    const scope = await requireSessionWorkspace();
    await addDocumentToCollection(scope, collectionId, documentId);
    revalidatePath('/library');
    return { success: true };
  } catch (error) {
    console.error('Failed to add to collection:', error);
    return {
      success: false,
      error: publicErrorMessage(error, 'Failed to add to collection'),
    };
  }
}

export async function removeFromCollectionAction(
  collectionId: string,
  documentId: string,
) {
  try {
    const scope = await requireSessionWorkspace();
    await removeDocumentFromCollection(scope, collectionId, documentId);
    revalidatePath('/library');
    return { success: true };
  } catch (error) {
    console.error('Failed to remove from collection:', error);
    return {
      success: false,
      error: publicErrorMessage(error, 'Failed to remove from collection'),
    };
  }
}
