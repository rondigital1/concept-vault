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

export function ChatHistorySidebar({
  isOpen,
  onToggle,
  currentSessionId,
  onNewChat,
}: ChatHistorySidebarProps) {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR<SessionSummary[]>(
    isOpen ? 'chat-sessions' : null,
    () => listSessionsAction()
  );
  const sessions = data ?? [];

  const handleSelectSession = (sessionId: string) => {
    router.push(`/chat?session=${sessionId}`);
  };

  const handleDeleteSession = async (
    e: React.MouseEvent,
    sessionId: string
  ) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      'Are you sure you want to delete this conversation?'
    );
    if (!confirmed) return;

    const nextSessions = sessions.filter((s) => s.id !== sessionId);
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="w-72 flex-shrink-0 bg-white border-r border-stone-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-stone-200">
        <h2 className="text-sm font-semibold text-stone-800">
          Chat History
        </h2>
        <button
          onClick={onToggle}
          className="p-1.5 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
          title="Close sidebar"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3 border-b border-stone-100">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-black transition-colors text-sm font-medium"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Chat
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 bg-stone-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-stone-500 text-sm">
            No conversations yet
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  currentSessionId === session.id
                    ? 'bg-stone-100'
                    : 'hover:bg-stone-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-stone-800 truncate">
                    {session.title}
                  </div>
                  {session.preview && (
                    <div className="text-xs text-stone-500 truncate mt-0.5">
                      {session.preview}
                    </div>
                  )}
                  <div className="text-xs text-stone-400 mt-1">
                    {formatDate(session.updatedAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                  title="Delete conversation"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
