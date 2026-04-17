'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type MouseEvent as ReactMouseEvent } from 'react';
import useSWR from 'swr';
import {
  deleteSessionAction,
  listSessionsAction,
  type SessionSummary,
} from '@/app/actions/chatHistoryActions';
import { ConfirmDialog } from '@/app/components/OverlaySurface';
import { toast } from '@/app/components/Toast';
import { AskVaultIcon } from './AskVaultIcon';

type SidebarVariant = 'desktop' | 'drawer';

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentSessionId: string | null;
  onNewChat: () => void;
  variant?: SidebarVariant;
}

const PRIMARY_LINKS = [
  { href: '/today', label: 'Research', icon: 'research' as const },
  { href: '/library', label: 'Library', icon: 'library' as const },
  { href: '/reports', label: 'Reports', icon: 'reports' as const },
] as const;

const FOOTER_LINKS = [
  { href: '/ingest', label: 'Add Content', icon: 'ingest' as const },
  { href: '/agents', label: 'Agents', icon: 'agents' as const },
] as const;

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

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function ChatHistorySidebar({
  isOpen,
  currentSessionId,
  onNewChat,
  variant = 'desktop',
}: ChatHistorySidebarProps) {
  const pathname = usePathname() ?? '';
  const [pendingDeleteSession, setPendingDeleteSession] = useState<SessionSummary | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const { data, isLoading, mutate } = useSWR<SessionSummary[]>(
    isOpen ? `chat-sessions-${variant}` : null,
    () => listSessionsAction(),
  );
  const sessions = data ?? [];
  const isDrawer = variant === 'drawer';

  const handleDeleteSession = (event: ReactMouseEvent, session: SessionSummary) => {
    event.preventDefault();
    event.stopPropagation();
    setPendingDeleteSession(session);
  };

  const confirmDeleteSession = async () => {
    if (!pendingDeleteSession) {
      return;
    }

    const sessionId = pendingDeleteSession.id;
    const sessionTitle = pendingDeleteSession.title;
    setIsDeletingSession(true);

    const nextSessions = sessions.filter((session) => session.id !== sessionId);
    try {
      await mutate(nextSessions, { revalidate: false });

      const result = await deleteSessionAction(sessionId);
      if (result.success) {
        if (currentSessionId === sessionId) {
          onNewChat();
        }
        await mutate();
        toast.success(`Removed "${sessionTitle}" from Ask Vault history.`);
      } else {
        await mutate();
        toast.error(result.error || 'Failed to delete conversation');
      }
    } catch {
      await mutate();
      toast.error('Failed to delete conversation');
    } finally {
      setIsDeletingSession(false);
      setPendingDeleteSession(null);
    }
  };

  return (
    <>
      <aside
        className={cx(
          'flex h-full flex-col overflow-hidden bg-[#1a1a1a]/92 text-[#dfdbdb] backdrop-blur-2xl',
          isDrawer ? 'min-h-0 rounded-none' : 'rounded-none shadow-[0_28px_80px_rgba(0,0,0,0.38)]',
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-6 pt-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.04] text-[#d8d3d3] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <AskVaultIcon name="robot" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[1.05rem] font-bold tracking-[-0.04em] text-[#c7c2c2]">
                Research Agent
              </h2>
              <p className="mt-1 text-[0.68rem] font-medium uppercase tracking-[0.24em] text-[#a29b9b]">
                V2_0_ACTIVE
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 pb-4">
          <button
            type="button"
            onClick={onNewChat}
            className="flex w-full items-center gap-3 rounded-2xl bg-[#979494] px-4 py-3.5 text-left text-[1.02rem] font-semibold tracking-[-0.03em] text-[#171717] transition hover:bg-[#afacac]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/20 text-[#171717]">
              <AskVaultIcon name="plus" className="h-4 w-4" />
            </span>
            <span>New Chat</span>
          </button>
        </div>

        <div className="space-y-1 px-4">
          {PRIMARY_LINKS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-[1rem] tracking-[-0.03em] transition',
                  active
                    ? 'bg-white/[0.05] text-white'
                    : 'text-[#d0cbcb] hover:bg-white/[0.04] hover:text-white',
                )}
              >
                <span className="text-[#b8b1b1]">
                  <AskVaultIcon name={item.icon} className="h-[18px] w-[18px]" />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-10">
          <div className="mb-5 px-1">
            <p className="text-[0.76rem] font-semibold uppercase tracking-[0.28em] text-[#c2bdbd]">
              Recent Sessions
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-[1.35rem] bg-[#151515] px-4 py-5 text-sm leading-6 text-[#8c8686]">
              No saved conversations yet. Start with a question once your vault has material to inspect.
            </div>
          ) : (
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
                      onClick={(event) => handleDeleteSession(event, session)}
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
          )}
        </div>

        <div className="px-5 pb-5 pt-3">
          <Link
            href="/ingest"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#8d8a8a] to-[#d2cece] px-4 py-3 text-[0.98rem] font-semibold tracking-[-0.03em] text-[#151515] shadow-[0_18px_34px_rgba(0,0,0,0.22)] transition hover:from-[#a39f9f] hover:to-[#e2dddd]"
          >
            <AskVaultIcon name="ingest" className="h-4 w-4" />
            <span>Add Content</span>
          </Link>

          <div className="mt-5 space-y-1">
            {FOOTER_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[0.96rem] tracking-[-0.03em] text-[#d0cbcb] transition hover:bg-white/[0.04] hover:text-white"
              >
                <AskVaultIcon name={item.icon} className="h-[18px] w-[18px] text-[#b8b1b1]" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </aside>

      <ConfirmDialog
        open={pendingDeleteSession !== null}
        onClose={() => {
          if (!isDeletingSession) {
            setPendingDeleteSession(null);
          }
        }}
        onConfirm={() => {
          void confirmDeleteSession();
        }}
        title="Delete conversation?"
        description="This removes the conversation from Ask Vault history and cannot be undone."
        confirmLabel="Delete conversation"
        cancelLabel="Keep conversation"
        confirmTone="danger"
        busy={isDeletingSession}
      >
        {pendingDeleteSession ? (
          <p>
            <span className="font-semibold text-white">{pendingDeleteSession.title}</span> will be
            removed from the session list and can no longer be reopened.
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
