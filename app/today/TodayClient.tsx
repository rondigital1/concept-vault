'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKeyboardShortcuts, KeyboardShortcutsHelp } from '@/app/components/KeyboardShortcuts';
import { toast, ToastContainer } from '@/app/components/Toast';

export function TodayClient() {
  const router = useRouter();

  useEffect(() => {
    function isArtifactActionForm(form: HTMLFormElement): boolean {
      const action = form.getAttribute('action') ?? form.action;
      return /\/api\/artifacts\/[^/]+\/(approve|reject)(?:\?.*)?$/.test(action);
    }

    function decisionFromAction(action: string): 'approved' | 'rejected' {
      return /\/approve(?:\?|$)/.test(action) ? 'approved' : 'rejected';
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

      if (button) {
        button.disabled = true;
        button.textContent = 'Saving...';
      }

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        const payload = await response.json().catch(() => null) as
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

        const decision = decisionFromAction(form.action);
        const itemElement = form.closest('[data-inbox-item]');
        if (itemElement instanceof HTMLElement) {
          itemElement.setAttribute('data-reviewed', 'true');
          itemElement.style.display = 'none';
        }

        const countElement = document.getElementById('review-inbox-count');
        if (countElement) {
          const current = Number.parseInt((countElement.textContent ?? '').trim(), 10);
          if (Number.isFinite(current) && current > 0) {
            countElement.textContent = String(current - 1);
          }
        }

        if (decision === 'approved' && payload?.libraryImport) {
          toast.success(
            payload.libraryImport.created
              ? 'Approved. Saved to Library and future topic reports can use it.'
              : 'Approved. This source was already in Library and will stay available for future topic reports.',
          );
        } else {
          toast.success(`Artifact ${decision}`);
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

  // Set up copy-to-clipboard for error messages
  useEffect(() => {
    function handleCopyClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const copyBtn = target.closest('[data-copy-error]') as HTMLElement | null;
      if (copyBtn) {
        const errorText = copyBtn.getAttribute('data-copy-error');
        if (errorText) {
          navigator.clipboard.writeText(errorText).then(() => {
            toast.success('Error copied to clipboard');
          }).catch(() => {
            toast.error('Failed to copy');
          });
        }
      }
    }

    document.addEventListener('click', handleCopyClick);
    return () => {
      document.removeEventListener('click', handleCopyClick);
    };
  }, []);

  const shortcuts = [
    {
      key: 'r',
      description: 'Refresh page',
      action: () => {
        router.refresh();
        toast.success('Page refreshed!');
      },
    },
    {
      key: 'p',
      description: 'Choose Report Topic',
      action: () => {
        router.push('/web-scout?runMode=full_report');
      },
    },
    {
      key: 'o',
      description: 'Go to Reports',
      action: () => {
        router.push('/reports');
      },
    },
    {
      key: 'i',
      description: 'Go to Ingest',
      action: () => {
        router.push('/ingest');
      },
    },
    {
      key: 'l',
      description: 'Go to Library',
      action: () => {
        router.push('/library');
      },
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return (
    <>
      <ToastContainer />
      <KeyboardShortcutsHelp shortcuts={shortcuts} />
    </>
  );
}
