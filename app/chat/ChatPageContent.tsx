'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import dynamic from 'next/dynamic';
import { saveToLibraryAction } from '../actions/saveToLibraryAction';
import { ContextMenu } from '../components/ContextMenu';
import { SaveToLibraryModal } from '../components/SaveToLibraryModal';
import { toast, ToastContainer } from '../components/Toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ChatHistorySidebar } from './components/ChatHistorySidebar';
import { useChatSession } from './hooks/useChatSession';
import type { Message } from './types';

type ContextMenuState = {
  x: number;
  y: number;
  text: string;
  messageId: string;
};

const MarkdownMessage = dynamic(
  () => import('./components/MarkdownMessage').then((mod) => mod.MarkdownMessage),
  {
    loading: () => <div className="h-4 animate-pulse rounded bg-zinc-800" />,
  }
);

function formatOutlineLabel(content: string, index: number): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return `Message ${index}`;
  }
  if (normalized.length <= 52) {
    return normalized;
  }
  return `${normalized.slice(0, 52)}...`;
}

function getTargetScrollTop(container: HTMLDivElement, target: HTMLDivElement): number {
  let offsetTop = 0;
  let node: HTMLElement | null = target;

  while (node && node !== container) {
    offsetTop += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }

  if (node === container) {
    return offsetTop;
  }

  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  return container.scrollTop + targetRect.top - containerRect.top;
}

export function ChatPageContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [selectedTimelineMessageId, setSelectedTimelineMessageId] = useState<string | null>(null);
  const [isOutlineDrawerOpen, setIsOutlineDrawerOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [textToSave, setTextToSave] = useState('');
  const [defaultTitle, setDefaultTitle] = useState('');
  const messageScrollContainerRef = useRef<HTMLDivElement>(null);
  const userMessageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimeoutRef = useRef<number | null>(null);

  const {
    sessionId,
    message,
    messages,
    isLoading,
    isTyping,
    isLoadingSession,
    isRefreshingSuggestions,
    textareaRef,
    messagesEndRef,
    setMessage,
    handleSubmit,
    handleKeyDown,
    retryFailedMessage,
    refreshSuggestions,
    handleNewChat,
  } = useChatSession();

  const userMessages = useMemo(
    () => messages.filter((msg) => msg.role === 'user'),
    [messages]
  );

  const messageOutlineLinks = useMemo(
    () =>
      userMessages.map((msg, index) => ({
        id: msg.id,
        label: formatOutlineLabel(msg.content, index + 1),
      })),
    [userMessages]
  );
  const highlightedMessageId = selectedTimelineMessageId ?? activeMessageId;

  useEffect(() => {
    if (userMessages.length === 0) {
      isProgrammaticScrollRef.current = false;
      if (programmaticScrollTimeoutRef.current !== null) {
        window.clearTimeout(programmaticScrollTimeoutRef.current);
        programmaticScrollTimeoutRef.current = null;
      }
      if (activeMessageId !== null) {
        setActiveMessageId(null);
      }
      if (selectedTimelineMessageId !== null) {
        setSelectedTimelineMessageId(null);
      }
      userMessageRefs.current = {};
      return;
    }

    const userMessageIds = new Set(userMessages.map((msg) => msg.id));
    Object.keys(userMessageRefs.current).forEach((messageId) => {
      if (!userMessageIds.has(messageId)) {
        delete userMessageRefs.current[messageId];
      }
    });

    const nextActiveMessageId =
      activeMessageId && userMessageIds.has(activeMessageId)
        ? activeMessageId
        : (userMessages[userMessages.length - 1]?.id ?? null);
    if (nextActiveMessageId !== activeMessageId) {
      setActiveMessageId(nextActiveMessageId);
    }

    if (selectedTimelineMessageId && !userMessageIds.has(selectedTimelineMessageId)) {
      setSelectedTimelineMessageId(null);
    }
  }, [activeMessageId, selectedTimelineMessageId, userMessages]);

  useEffect(() => {
    const root = messageScrollContainerRef.current;
    if (!root || userMessages.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScrollRef.current) {
          return;
        }

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        const firstVisible = visible[0];
        if (!firstVisible) {
          return;
        }

        const messageId = (firstVisible.target as HTMLElement).dataset.messageId;
        if (messageId) {
          setActiveMessageId((current) => (current === messageId ? current : messageId));
        }
      },
      {
        root,
        rootMargin: '-12% 0px -70% 0px',
        threshold: 0.1,
      }
    );

    userMessages.forEach((msg) => {
      const node = userMessageRefs.current[msg.id];
      if (node) {
        observer.observe(node);
      }
    });

    return () => observer.disconnect();
  }, [userMessages]);

  useEffect(() => {
    return () => {
      if (programmaticScrollTimeoutRef.current !== null) {
        window.clearTimeout(programmaticScrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOutlineDrawerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOutlineDrawerOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOutlineDrawerOpen]);

  const handleContextMenu = useCallback((e: MouseEvent, msg: Message) => {
    e.preventDefault();

    if (msg.role !== 'assistant') {
      return;
    }

    const selectedText = window.getSelection()?.toString().trim();
    const textToSave = selectedText || msg.content;

    if (!textToSave) {
      return;
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      text: textToSave,
      messageId: msg.id,
    });
  }, []);

  const handleSaveToLibrary = useCallback(() => {
    if (!contextMenu) {
      return;
    }

    const messageIndex = messages.findIndex((msg) => msg.id === contextMenu.messageId);

    let userPrompt = '';
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userPrompt = messages[i].content;
        break;
      }
    }

    setTextToSave(contextMenu.text);
    setDefaultTitle(userPrompt || 'Saved from chat');
    setShowSaveModal(true);
    setContextMenu(null);
  }, [contextMenu, messages]);

  const handleSaveWithTitle = useCallback(async (title: string, content: string) => {
    if (!content || !content.trim()) {
      toast.error('No content to save');
      return;
    }

    try {
      const result = await saveToLibraryAction(content, title);

      if (result.success) {
        const message = result.created
          ? `Saved "${title}" to library`
          : `"${title}" already exists in library`;
        toast.success(message);
      } else {
        toast.error(result.error || 'Failed to save to library');
        console.error('Failed to save:', result.error);
      }
    } catch (error) {
      toast.error('Error saving to library');
      console.error('Error saving to library:', error);
    }
  }, []);

  const handleNewChatClick = useCallback(() => {
    if (programmaticScrollTimeoutRef.current !== null) {
      window.clearTimeout(programmaticScrollTimeoutRef.current);
      programmaticScrollTimeoutRef.current = null;
    }
    isProgrammaticScrollRef.current = false;
    handleNewChat();
    setSidebarOpen(false);
    setIsOutlineDrawerOpen(false);
    setSelectedTimelineMessageId(null);
  }, [handleNewChat]);

  const handleJumpToMessage = useCallback((messageId: string) => {
    const target = userMessageRefs.current[messageId];
    const container = messageScrollContainerRef.current;
    if (!target || !container) {
      return;
    }

    if (programmaticScrollTimeoutRef.current !== null) {
      window.clearTimeout(programmaticScrollTimeoutRef.current);
    }

    isProgrammaticScrollRef.current = true;
    setActiveMessageId(messageId);
    setSelectedTimelineMessageId(messageId);
    container.scrollTo({
      top: Math.max(0, getTargetScrollTop(container, target) - 16),
      behavior: 'smooth',
    });

    programmaticScrollTimeoutRef.current = window.setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      programmaticScrollTimeoutRef.current = null;
    }, 700);
  }, []);

  const handleJumpToMessageFromDrawer = useCallback(
    (messageId: string) => {
      handleJumpToMessage(messageId);
      setIsOutlineDrawerOpen(false);
    },
    [handleJumpToMessage]
  );

  return (
    <div className="flex h-[calc(100vh-73px)] bg-gradient-to-b from-black via-zinc-950 to-black text-zinc-100">
      <ChatHistorySidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentSessionId={sessionId}
        onNewChat={handleNewChatClick}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-none border-b border-white/5 bg-black/40 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
                title="Toggle chat history"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d97757]/20 bg-[#d97757]/10 shadow-sm">
                <svg className="h-5 w-5 text-[#f1b39a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-semibold text-white">Ask Vault</h1>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-400">
                    Secondary tool
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  Use chat for follow-up questions about saved documents, reports, and concepts.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOutlineDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10 xl:hidden"
            >
              <span>Prompts</span>
              <span className="rounded-md bg-white px-1.5 py-0.5 text-xs text-black">
                {messageOutlineLinks.length}
              </span>
            </button>
          </div>
        </div>

        <div ref={messageScrollContainerRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-7xl gap-8 px-6 py-8">
            <div className="min-w-0 flex-1">
              <div className="mx-auto max-w-4xl space-y-8">
                {isLoadingSession ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3 text-zinc-500">
                      <LoadingSpinner className="h-5 w-5 border-zinc-700 border-t-zinc-200" />
                      <span>Loading conversation...</span>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      id={msg.role === 'user' ? `chat-message-${msg.id}` : undefined}
                      data-message-id={msg.role === 'user' ? msg.id : undefined}
                      ref={
                        msg.role === 'user'
                          ? (node) => {
                            if (node) {
                              userMessageRefs.current[msg.id] = node;
                            } else {
                              delete userMessageRefs.current[msg.id];
                            }
                          }
                          : undefined
                      }
                      className={`flex gap-4 scroll-mt-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                          <svg className="h-4 w-4 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14a1 1 0 1 1 1-1 1 1 0 0 1-1 1zm2.36-5.24a2 2 0 0 0 .64-1.76 2 2 0 0 0-4 0c0 .53.21 1.04.59 1.41a2 2 0 0 1 .59 1.41V12h2.36v-.36a4 4 0 0 0-1.18-2.88z" />
                          </svg>
                        </div>
                      )}

                      <div className={`flex max-w-[85%] flex-col space-y-1 ${msg.role === 'user' ? 'items-end' : ''}`}>
                        <div className={`text-xs font-medium ${msg.role === 'user' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          {msg.role === 'user' ? 'You' : 'Vault'}
                        </div>
                        <div
                          className={`text-[15px] leading-7 ${
                            msg.role === 'user'
                              ? 'rounded-2xl rounded-tr-sm border border-[#d97757]/25 bg-[#d97757]/10 px-4 py-3 text-zinc-100 [&::selection]:bg-[#d97757]/30 [&::selection]:text-white'
                              : msg.status === 'failed'
                                ? 'px-1 py-0.5 text-red-300'
                                : 'px-1 py-0.5 text-zinc-100'
                          }`}
                          onContextMenu={(e) => handleContextMenu(e, msg)}
                          style={{ userSelect: 'text', cursor: 'text' }}
                        >
                          {msg.role === 'assistant' ? (
                            <MarkdownMessage content={msg.content} />
                          ) : (
                            <>{msg.content}</>
                          )}
                        </div>
                        {msg.role === 'assistant' && msg.status === 'failed' && msg.failedRequestContent && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => retryFailedMessage(msg.id)}
                              disabled={isLoading}
                              className="inline-flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isLoading ? 'Retrying...' : 'Retry'}
                            </button>
                          </div>
                        )}
                        {msg.suggestedReplies && msg.suggestedReplies.length > 0 && (
                          <div className="mt-3 w-full">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-medium text-zinc-500">Suggested prompts</span>
                              <button
                                onClick={refreshSuggestions}
                                disabled={isRefreshingSuggestions}
                                className="flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300 disabled:opacity-50"
                                title="Get new suggestions"
                              >
                                <svg
                                  className={`w-3.5 h-3.5 ${isRefreshingSuggestions ? 'animate-spin' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                  />
                                </svg>
                                {isRefreshingSuggestions ? 'Refreshing...' : 'Refresh'}
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                              {msg.suggestedReplies.map((reply, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    handleSubmit(undefined, reply);
                                  }}
                                  className="flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-zinc-100 transition-all hover:bg-white/10"
                                >
                                  {reply}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {!isLoadingSession && isTyping && (
                  <div className="flex justify-start gap-4">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                      <svg className="h-4 w-4 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14a1 1 0 1 1 1-1 1 1 0 0 1-1 1zm2.36-5.24a2 2 0 0 0 .64-1.76 2 2 0 0 0-4 0c0 .53.21 1.04.59 1.41a2 2 0 0 1 .59 1.41V12h2.36v-.36a4 4 0 0 0-1.18-2.88z" />
                      </svg>
                    </div>
                    <div className="flex h-8 items-center gap-1.5">
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.3s]" />
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.15s]" />
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <aside className="hidden xl:block xl:w-72 xl:shrink-0">
              <div className="sticky top-4 rounded-2xl border border-white/10 bg-zinc-950/80 p-3">
                <div className="px-2 pb-2">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Prompt Timeline
                  </h2>
                  <p className="mt-1 text-xs text-zinc-600">Quick jumps through your questions</p>
                </div>

                {messageOutlineLinks.length === 0 ? (
                  <p className="px-2 pb-2 text-sm text-zinc-500">
                    Send a message to build quick links.
                  </p>
                ) : (
                  <nav className="max-h-[calc(100vh-220px)] space-y-1 overflow-y-auto pr-1">
                    {messageOutlineLinks.map((link, index) => (
                      <button
                        key={link.id}
                        onClick={() => handleJumpToMessage(link.id)}
                        className={`w-full rounded-xl border-l-4 px-2 py-2 text-left text-sm transition-colors ${
                          highlightedMessageId === link.id
                            ? 'border-[#d97757] bg-[#d97757]/10 text-white'
                            : 'border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                        }`}
                      >
                        <span className="mr-2 text-[11px] font-medium opacity-70">{index + 1}.</span>
                        <span>{link.label}</span>
                      </button>
                    ))}
                  </nav>
                )}
              </div>
            </aside>
          </div>
        </div>

        <div className="flex-none border-t border-white/5 bg-black/40 px-6 py-4 backdrop-blur-xl">
          <div className="mx-auto max-w-4xl">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
              <span>Ask about saved documents, reports, or concepts already in your vault.</span>
              <span>Use Research for new runs and approvals.</span>
            </div>
            <div className="relative flex items-end gap-2 rounded-2xl border border-white/10 bg-black/30 p-2">
              <div className="relative flex-1">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your saved material..."
                  rows={1}
                  className="max-h-[200px] w-full resize-none border-0 bg-transparent py-3 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-0"
                  style={{ minHeight: '44px' }}
                />
              </div>

              <button
                onClick={() => handleSubmit()}
                disabled={!message.trim() || isLoading}
                className={`mb-1 rounded-lg p-2 transition-all duration-200 ${
                  message.trim() && !isLoading
                    ? 'bg-[#d97757] text-white shadow-sm hover:bg-[#c66849]'
                    : 'cursor-not-allowed bg-white/5 text-zinc-500'
                }`}
              >
                {isLoading ? (
                  <LoadingSpinner className="h-5 w-5 border-white/40 border-t-white p-0.5" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
            <div className="pt-2 text-center">
              <p className="text-xs text-zinc-600">
                Markdown supported. The assistant can make mistakes, so verify important information before acting on it.
              </p>
            </div>
          </div>
        </div>

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onSaveToLibrary={handleSaveToLibrary}
          />
        )}

        <SaveToLibraryModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={handleSaveWithTitle}
          defaultText={textToSave}
          defaultTitle={defaultTitle}
        />

        <ToastContainer />
      </div>

      {isOutlineDrawerOpen && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button
            type="button"
            aria-label="Close message links"
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsOutlineDrawerOpen(false)}
          />

          <aside className="absolute right-0 top-0 h-full w-[86vw] max-w-sm border-l border-white/10 bg-zinc-950 shadow-xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-white">Prompt Timeline</h2>
                  <p className="text-xs text-zinc-500">Jump through your recent questions</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOutlineDrawerOpen(false)}
                  className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
                  title="Close message links"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3">
                {messageOutlineLinks.length === 0 ? (
                  <p className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3 text-sm text-zinc-500">
                    Send a message to build quick links.
                  </p>
                ) : (
                  <nav className="space-y-1">
                    {messageOutlineLinks.map((link, index) => (
                      <button
                        key={link.id}
                        onClick={() => handleJumpToMessageFromDrawer(link.id)}
                        className={`w-full rounded-xl border-l-4 px-3 py-2 text-left text-sm transition-colors ${
                          highlightedMessageId === link.id
                            ? 'border-[#d97757] bg-[#d97757]/10 text-white'
                            : 'border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                        }`}
                      >
                        <span className="mr-2 text-[11px] font-medium opacity-70">{index + 1}.</span>
                        <span>{link.label}</span>
                      </button>
                    ))}
                  </nav>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
