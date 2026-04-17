'use client';

import { useEffect } from 'react';
import { RouteStatusShell } from './components/RouteStatusShell';
import { reportRouteError } from './components/routeErrorReporting';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportRouteError(error, 'global');
  }, [error]);

  return (
    <html lang="en">
      <body className="app-shell min-h-screen antialiased">
        <RouteStatusShell
          eyebrow="Application failure"
          title="The app shell failed before the route finished."
          description={error.message || 'An unexpected global error interrupted rendering.'}
          tone="danger"
          actions={(
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center rounded-full bg-[#efeded] px-5 py-3 text-[0.72rem] font-bold uppercase tracking-[0.24em] text-[#171717] transition hover:bg-white"
            >
              Reload app shell
            </button>
          )}
          links={[
            { href: '/today', label: 'Open Research', variant: 'secondary' },
          ]}
        />
      </body>
    </html>
  );
}
