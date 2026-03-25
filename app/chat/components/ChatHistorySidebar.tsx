'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  listSessionsAction,
  deleteSessionAction,
  SessionSummary,
} from '@/app/actions/chatHistoryActions';

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentSessionId: string | null;
  onNewChat: () => void;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function ChatHistorySidebar({
  isOpen,
  onToggle,
  currentSessionId,
  onNewChat,
}: ChatHistorySidebarProps) {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR<SessionSummary[]>(
    isOpen ? 'chat-sessions' : null,
    () => listSessionsAction(),
  );
  const sessions = data ?? [];

  const handleSelectSession = (sessionId: string) => {
    router.push(`/chat?session=${sessionId}`);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    const confirmed = window.confirm('Are you sure you want to delete this conversation?');
    if (!confirmed) return;

    const nextSessions = sessions.filter((session) => session.id !== sessionId);
    await mutate(nextSessions, { revalidate: false });

    const result = await deleteSessionAction(sessionId);
    if (result.success) {
      if (currentSessionId === sessionId) {
        onNewChat();
      }
      mutate();
    } else {
      mutate();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col overflow-hidden border-r border-white/5 bg-zinc-950">
      <div className="border-b border-white/5 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Ask Vault</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Recent conversations for follow-up questions.
            </p>
          </div>
          <button
            onClick={onToggle}
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
            title="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="border-b border-white/5 p-3">
        <button
          onClick={onNewChat}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Question
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-3 p-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-5 text-sm text-zinc-500">
            No conversations yet. Start with a question about your reports, documents, or concepts.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => {
              const isActive = currentSessionId === session.id;

              return (
                <div
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={`group flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
                    isActive
                      ? 'border-[#d97757]/35 bg-[#d97757]/10'
                      : 'border-transparent bg-white/[0.02] hover:border-white/5 hover:bg-white/[0.05]'
                  }`}
                >
                  <div
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      isActive ? 'bg-[#d97757]' : 'bg-zinc-700'
                    }`}
                  />

                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm font-semibold ${isActive ? 'text-white' : 'text-zinc-200'}`}>
                      {session.title}
                    </div>
                    {session.preview && (
                      <div className={`mt-1 truncate text-xs ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`}>
                        {session.preview}
                      </div>
                    )}
                    <div className={`mt-2 text-xs ${isActive ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {formatDate(session.updatedAt)}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className={`rounded-md p-1 transition-all ${
                      isActive
                        ? 'text-zinc-400 hover:bg-white/5 hover:text-white'
                        : 'text-zinc-600 opacity-0 hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100'
                    }`}
                    title="Delete conversation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
