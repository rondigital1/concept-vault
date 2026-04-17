'use client';

import { useEffect } from 'react';
import { RouteStatusShell } from './components/RouteStatusShell';
import { reportRouteError } from './components/routeErrorReporting';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportRouteError(error, 'segment');
  }, [error]);

  return (
    <RouteStatusShell
      eyebrow="Route failure"
      title="This workspace could not finish loading."
      description={error.message || 'An unexpected route error interrupted rendering.'}
      tone="danger"
      actions={(
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-full bg-[#efeded] px-5 py-3 text-[0.72rem] font-bold uppercase tracking-[0.24em] text-[#171717] transition hover:bg-white"
        >
          Retry route
        </button>
      )}
      links={[
        { href: '/today', label: 'Open Research', variant: 'secondary' },
      ]}
    />
  );
}
