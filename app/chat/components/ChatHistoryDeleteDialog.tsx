'use client';

import type { SessionSummary } from '@/app/actions/chatHistoryActions';
import { ConfirmDialog } from '@/app/components/OverlaySurface';

export function ChatHistoryDeleteDialog({
  session,
  isDeleting,
  onClose,
  onConfirm,
}: {
  session: SessionSummary | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={session !== null}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete conversation?"
      description="This removes the conversation from Ask Vault history and cannot be undone."
      confirmLabel="Delete conversation"
      cancelLabel="Keep conversation"
      confirmTone="danger"
      busy={isDeleting}
    >
      {session ? (
        <p>
          <span className="font-semibold text-white">{session.title}</span> will be
          removed from the session list and can no longer be reopened.
        </p>
      ) : null}
    </ConfirmDialog>
  );
}
