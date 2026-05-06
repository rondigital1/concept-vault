'use client';

import Link from 'next/link';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { SessionSummary } from '@/app/actions/chatHistoryActions';
import { cx } from '../chatPresentation';
import { AskVaultIcon } from './AskVaultIcon';

function formatSessionDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return `Today, ${date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  }

  if (days === 1) {
    return 'Yesterday';
  }

  if (days < 7) {
    return `${days} days ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function LoadingSessions() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />
      ))}
    </div>
  );
}

function EmptySessions() {
  return (
    <div className="rounded-[1.35rem] bg-[#151515] px-4 py-5 text-sm leading-6 text-[#8c8686]">
      No saved conversations yet. Start with a question once your vault has material to inspect.
    </div>
  );
}

export function ChatHistorySessionList({
  isLoading,
  sessions,
  currentSessionId,
  onDeleteSession,
}: {
  isLoading: boolean;
  sessions: SessionSummary[];
  currentSessionId: string | null;
  onDeleteSession: (session: SessionSummary) => void;
}) {
  if (isLoading) {
    return <LoadingSessions />;
  }

  if (sessions.length === 0) {
    return <EmptySessions />;
  }

  return (
    <div className="space-y-1.5">
      {sessions.map((session) => {
        const isActive = currentSessionId === session.id;

        return (
          <div
            key={session.id}
            className={cx(
              'group flex items-start gap-3 rounded-[1.1rem] px-3 py-3 transition',
              isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]',
            )}
          >
            <Link
              href={`/chat?session=${session.id}`}
              aria-current={isActive ? 'page' : undefined}
              className="flex min-w-0 flex-1 items-start gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a]"
            >
              <div className="mt-[0.15rem] flex h-5 w-5 items-center justify-center text-[#cfcaca]">
                <AskVaultIcon name="chat" className="h-[15px] w-[15px]" />
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className={cx(
                    'truncate text-[0.98rem] font-medium tracking-[-0.03em]',
                    isActive ? 'text-white' : 'text-[#ddd8d8]',
                  )}
                >
                  {session.title}
                </div>
                <div className="mt-1 text-[0.75rem] text-[#8f8888]">
                  {formatSessionDate(session.updatedAt)}
                </div>
                {session.preview ? (
                  <div className="mt-1.5 line-clamp-2 text-[0.76rem] leading-5 text-[#9e9797]">
                    {session.preview}
                  </div>
                ) : null}
              </div>
            </Link>

            <button
              type="button"
              onClick={(event: ReactMouseEvent) => {
                event.preventDefault();
                event.stopPropagation();
                onDeleteSession(session);
              }}
              className={cx(
                'flex h-8 w-8 items-center justify-center rounded-full text-[#7f7878] transition',
                isActive
                  ? 'hover:bg-white/[0.07] hover:text-white'
                  : 'opacity-0 hover:bg-[#3b1717] hover:text-[#ffd4d0] group-hover:opacity-100',
              )}
              title="Delete conversation"
              aria-label={`Delete conversation ${session.title}`}
            >
              <AskVaultIcon name="delete" className="h-[15px] w-[15px]" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
