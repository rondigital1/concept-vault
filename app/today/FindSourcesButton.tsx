'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/app/components/Toast';
import { primaryButtonClass, secondaryButtonClass } from './WorkspaceHeaderPrimitives';

type Props =
  | { scope: 'topic'; topicId: string; topicName: string; emphasis?: 'primary' | 'secondary'; label?: string }
  | { scope: 'all_topics'; topicId?: undefined; topicName?: undefined; label?: string };

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
      const endpoint = isBatch ? '/api/runs/find-sources' : '/api/runs/pipeline';

      if (!isBatch) {
        body.runMode = 'scout_only';
        body.enableCategorization = true;
      }

      const response = await fetch(endpoint, {
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
        toast.success(`Queued source discovery for ${props.topicName}`);
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
      {busy ? 'Finding...' : props.label ?? (isBatch ? 'Find Sources for All' : 'Find Sources')}
    </button>
  );
}
