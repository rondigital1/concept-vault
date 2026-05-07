'use client';

import { ConfirmDialog } from '@/app/components/OverlaySurface';
import type { CollectionRow } from '@/server/repos/collections.repo';

type Props = {
  target: CollectionRow | null;
  error: string | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteCollectionDialog({
  target,
  error,
  isPending,
  onClose,
  onConfirm,
}: Props) {
  return (
    <ConfirmDialog
      open={target !== null}
      onClose={onClose}
      onConfirm={onConfirm}
      title={target ? `Delete ${target.name}` : 'Delete collection'}
      description="This removes the collection container only. The documents stay in the library."
      confirmLabel="Delete collection"
      confirmTone="danger"
      busy={isPending}
    >
      {error ? (
        <p role="alert" className="text-[#f2c7bc]">
          {error}
        </p>
      ) : null}
    </ConfirmDialog>
  );
}
