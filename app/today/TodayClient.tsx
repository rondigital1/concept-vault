'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKeyboardShortcuts, KeyboardShortcutsHelp } from '@/app/components/KeyboardShortcuts';
import { toast, ToastContainer } from '@/app/components/Toast';

export function TodayClient() {
  const router = useRouter();

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
      key: 'd',
      description: 'Run Distill',
      action: async () => {
        toast.info('Starting Distill run...');
        try {
          const res = await fetch('/api/runs/distill', { method: 'POST' });
          if (res.ok) {
            toast.success('Distill run started!');
            router.refresh();
          } else {
            toast.error('Distill run failed');
          }
        } catch {
          toast.error('Failed to start Distill');
        }
      },
    },
    {
      key: 'u',
      description: 'Run Curate',
      action: async () => {
        toast.info('Starting Curate run...');
        try {
          const res = await fetch('/api/runs/curate', { method: 'POST' });
          if (res.ok) {
            toast.success('Curate run started!');
            router.refresh();
          } else {
            toast.error('Curate run failed');
          }
        } catch {
          toast.error('Failed to start Curate');
        }
      },
    },
    {
      key: 'w',
      description: 'Run Web Scout',
      action: async () => {
        toast.info('Starting Web Scout run...');
        try {
          const res = await fetch('/api/runs/web-scout', { method: 'POST' });
          if (res.ok) {
            toast.success('Web Scout run started!');
            router.refresh();
          } else {
            toast.error('Web Scout run failed');
          }
        } catch {
          toast.error('Failed to start Web Scout');
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
