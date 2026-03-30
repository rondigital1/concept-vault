'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, ToastContainer } from '@/app/components/Toast';

export function TodayClient() {
  const router = useRouter();

  useEffect(() => {
    function isArtifactActionForm(form: HTMLFormElement): boolean {
      return form.dataset.artifactAction === 'approve' || form.dataset.artifactAction === 'reject';
    }

    async function handleArtifactActionSubmit(event: Event) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !isArtifactActionForm(form)) {
        return;
      }

      event.preventDefault();

      const submitEvent = event as SubmitEvent;
      const submitter =
        submitEvent.submitter instanceof HTMLButtonElement ? submitEvent.submitter : null;
      const fallbackButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      const button = submitter ?? fallbackButton;
      const previousLabel = button?.textContent ?? '';
      const action = form.dataset.artifactAction ?? 'approve';

      if (button) {
        button.disabled = true;
        button.textContent = action === 'approve' ? 'Saving...' : 'Rejecting...';
      }

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        const payload = (await response.json().catch(() => null)) as
          | {
              error?: string;
              libraryImport?: {
                status: 'imported' | 'linked';
                documentId: string;
                created: boolean;
              } | null;
            }
          | null;

        if (!response.ok) {
          const errorMessage =
            payload && typeof payload.error === 'string' ? payload.error : 'Action failed';
          throw new Error(errorMessage);
        }

        if (action === 'approve' && payload?.libraryImport) {
          toast.success(
            payload.libraryImport.created
              ? 'Saved. Added to Library and available for future topic reports.'
              : 'Saved. This source was already in Library and will stay available for future topic reports.',
          );
        } else {
          toast.success(action === 'approve' ? 'Evidence saved' : 'Evidence rejected');
        }

        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Action failed';
        toast.error(message);
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = previousLabel;
        }
      }
    }

    document.addEventListener('submit', handleArtifactActionSubmit);
    return () => {
      document.removeEventListener('submit', handleArtifactActionSubmit);
    };
  }, [router]);

  return <ToastContainer />;
}
