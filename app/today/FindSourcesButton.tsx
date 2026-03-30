'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/app/components/Toast';
import { primaryButtonClass, secondaryButtonClass } from './WorkspaceHeaderPrimitives';

type Props =
  | { scope: 'topic'; topicId: string; topicName: string; emphasis?: 'primary' | 'secondary' }
  | { scope: 'all_topics'; topicId?: undefined; topicName?: undefined };

export function FindSourcesButton(props: Props) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const isBatch = props.scope === 'all_topics';
  const emphasis = props.scope === 'topic' ? props.emphasis ?? 'primary' : 'secondary';

  async function handleClick() {
    setBusy(true);
    try {
      const body: Record<string, unknown> = isBatch
        ? { scope: 'all_topics' }
        : { topicId: props.topicId };

      const response = await fetch('/api/runs/find-sources', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload && typeof payload.error === 'string'
            ? payload.error
            : 'Failed to find sources';
        throw new Error(message);
      }

      if (isBatch) {
        const counts = payload?.counts;
        const succeeded = counts?.topicsSucceeded ?? 0;
        const failed = counts?.topicsFailed ?? 0;
        toast.success(
          `Find Sources complete: ${succeeded} topic${succeeded === 1 ? '' : 's'} succeeded` +
            (failed > 0 ? `, ${failed} failed` : ''),
        );
      } else {
        const proposals = payload?.counts?.webProposals ?? 0;
        toast.success(
          `Found ${proposals} source proposal${proposals === 1 ? '' : 's'} for ${props.topicName}`,
        );
      }

      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to find sources';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handleClick}
      className={
        isBatch
          ? `${secondaryButtonClass} bg-[color:var(--workbench-accent-soft)] text-[color:var(--workbench-accent-ink)]`
          : emphasis === 'primary'
            ? primaryButtonClass
            : secondaryButtonClass
      }
    >
      {busy ? 'Finding...' : isBatch ? 'Find Sources for All' : 'Find Sources'}
    </button>
  );
}
