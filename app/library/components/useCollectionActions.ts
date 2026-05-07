'use client';

import { useId, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  createCollectionAction,
  deleteCollectionAction,
} from '@/app/actions/collectionActions';
import type { CollectionRow } from '@/server/repos/collections.repo';

export function useCollectionActions() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CollectionRow | null>(null);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const openCreateDialog = () => {
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const closeCreateDialog = () => {
    if (!isPending) {
      setIsCreateOpen(false);
      setNewName('');
      setCreateError(null);
    }
  };

  const openDeleteDialog = (collection: CollectionRow) => {
    setDeleteError(null);
    setDeleteTarget(collection);
  };

  const closeDeleteDialog = () => {
    if (!isPending) {
      setDeleteTarget(null);
      setDeleteError(null);
    }
  };

  const handleNameChange = (value: string) => {
    setNewName(value);
    if (createError) {
      setCreateError(null);
    }
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) {
      setCreateError('Enter a name before creating the collection.');
      return;
    }

    startTransition(async () => {
      const result = await createCollectionAction(name);
      if (!result.success) {
        setCreateError(result.error ?? 'Failed to create collection.');
        return;
      }

      setNewName('');
      setCreateError(null);
      setIsCreateOpen(false);
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) {
      return;
    }

    startTransition(async () => {
      const target = deleteTarget;
      const result = await deleteCollectionAction(target.id);

      if (!result.success) {
        setDeleteError(result.error ?? 'Failed to delete collection.');
        return;
      }

      setDeleteError(null);
      setDeleteTarget(null);

      if (pathname === `/library/collections/${target.id}`) {
        router.push('/library');
      }
    });
  };

  return {
    isCreateOpen,
    deleteTarget,
    newName,
    createError,
    deleteError,
    isPending,
    formId,
    inputRef,
    openCreateDialog,
    closeCreateDialog,
    openDeleteDialog,
    closeDeleteDialog,
    handleNameChange,
    handleCreate,
    handleDeleteConfirm,
  };
}
