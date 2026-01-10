'use client';

import { useRouter } from 'next/navigation';
import { useKeyboardShortcuts, KeyboardShortcutsHelp } from '@/app/components/KeyboardShortcuts';
import { toast, ToastContainer } from '@/app/components/Toast';

export function TodayClient() {
  const router = useRouter();

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
      key: 'd',
      description: 'Run Distill',
      action: async () => {
        toast.info('Starting Distill run...');
        try {
          const res = await fetch('/api/runs/distill', { method: 'POST' });
          if (res.ok) {
            toast.success('Distill run started!');
          } else {
            toast.error('Distill run failed');
          }
        } catch {
          toast.error('Failed to start Distill');
        }
      },
    },
    {
      key: 'c',
      description: 'Focus chat input',
      action: () => {
        const chatInput = document.querySelector('input[placeholder*="Ask me"]') as HTMLInputElement;
        if (chatInput) {
          chatInput.focus();
          toast.info('Chat focused');
        }
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
