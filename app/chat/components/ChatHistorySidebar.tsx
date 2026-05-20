'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import {
  deleteSessionAction,
  listSessionsAction,
  type SessionSummary,
} from '@/app/actions/chatHistoryActions';
import { toast } from '@/app/components/Toast';
import { cx } from '../chatPresentation';
import { AskVaultIcon } from './AskVaultIcon';
import { ChatHistoryDeleteDialog } from './ChatHistoryDeleteDialog';
import { ChatHistorySessionList } from './ChatHistorySessionList';

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

  const handleDeleteSession = (session: SessionSummary) => {
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
              <h2 className="text-[1.05rem] font-bold tracking-normal text-[#c7c2c2]">
                Research Agent
              </h2>
              <p className="mt-1 text-[0.68rem] font-medium uppercase tracking-[0.24em] text-[#a29b9b]">
                Version 2 active
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 pb-4">
          <button
            type="button"
            onClick={onNewChat}
            className="flex w-full items-center gap-3 rounded-2xl bg-[#979494] px-4 py-3.5 text-left text-[1.02rem] font-semibold tracking-normal text-[#171717] transition hover:bg-[#afacac]"
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
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-[1rem] tracking-normal transition',
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

          <ChatHistorySessionList
            isLoading={isLoading}
            sessions={sessions}
            currentSessionId={currentSessionId}
            onDeleteSession={handleDeleteSession}
          />
        </div>

        <div className="px-5 pb-5 pt-3">
          <Link
            href="/ingest"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#8d8a8a] to-[#d2cece] px-4 py-3 text-[0.98rem] font-semibold tracking-normal text-[#151515] shadow-[0_18px_34px_rgba(0,0,0,0.22)] transition hover:from-[#a39f9f] hover:to-[#e2dddd]"
          >
            <AskVaultIcon name="ingest" className="h-4 w-4" />
            <span>Add Content</span>
          </Link>

          <div className="mt-5 space-y-1">
            {FOOTER_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[0.96rem] tracking-normal text-[#d0cbcb] transition hover:bg-white/[0.04] hover:text-white"
              >
                <AskVaultIcon name={item.icon} className="h-[18px] w-[18px] text-[#b8b1b1]" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </aside>

      <ChatHistoryDeleteDialog
        session={pendingDeleteSession}
        isDeleting={isDeletingSession}
        onClose={() => {
          if (!isDeletingSession) {
            setPendingDeleteSession(null);
          }
        }}
        onConfirm={() => {
          void confirmDeleteSession();
        }}
      />
    </>
  );
}
