'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { saveToLibraryAction } from '../actions/saveToLibraryAction';
import { ContextMenu } from '../components/ContextMenu';
import { Drawer } from '../components/OverlaySurface';
import { SaveToLibraryModal } from '../components/SaveToLibraryModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { toast, ToastContainer } from '../components/Toast';
import { AskVaultIcon } from './components/AskVaultIcon';
import { ChatHistorySidebar } from './components/ChatHistorySidebar';
import { useChatSession } from './hooks/useChatSession';
import { WELCOME_MESSAGE, type Message } from './types';

type ContextMenuState = {
  x: number;
  y: number;
  text: string;
  messageId: string;
};

type TimelineLink = {
  id: string;
  label: string;
  meta: string;
};

const MarkdownMessage = dynamic(
  () => import('./components/MarkdownMessage').then((mod) => mod.MarkdownMessage),
  {
    loading: () => <div className="h-4 animate-pulse rounded bg-white/[0.08]" />,
  },
);

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

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

function getLastUserPrompt(messages: Message[], messageId: string) {
  const messageIndex = messages.findIndex((msg) => msg.id === messageId);

  for (let index = messageIndex - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      return messages[index].content;
    }
  }

  return '';
}

function formatTimelineMeta(timestamp: Date, index: number): string {
  if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) {
    return `Prompt ${String(index + 1).padStart(2, '0')}`;
  }

  return timestamp.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function AgentOrb({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cx(
        'relative flex items-center justify-center rounded-full bg-gradient-to-br from-[#7f7c7c] via-[#535353] to-[#202020] text-[#1b1b1b] shadow-[0_26px_52px_rgba(0,0,0,0.38)]',
        compact ? 'h-10 w-10' : 'h-24 w-24',
      )}
    >
      <div className="absolute inset-[10%] rounded-full bg-white/[0.08] blur-md" />
      <div className="absolute inset-[-10%] rounded-full bg-black/35 blur-2xl" />
      <AskVaultIcon
        name="brand"
        filled
        className={cx('relative z-10', compact ? 'h-[18px] w-[18px]' : 'h-9 w-9')}
      />
    </div>
  );
}

function PromptTimeline({
  links,
  highlightedMessageId,
  onJump,
}: {
  links: TimelineLink[];
  highlightedMessageId: string | null;
  onJump: (messageId: string) => void;
}) {
  if (links.length === 0) {
    return (
      <p className="rounded-[1.35rem] bg-[#161616] px-4 py-4 text-sm leading-6 text-[#8f8888]">
        Ask your first question to build the prompt timeline for this session.
      </p>
    );
  }

  return (
    <nav className="relative pl-6">
      <div className="absolute bottom-0 left-[0.3rem] top-1 w-px bg-white/[0.08]" />
      <div className="space-y-8">
        {links.map((link) => {
          const active = highlightedMessageId === link.id;

          return (
            <button
              key={link.id}
              type="button"
              onClick={() => onJump(link.id)}
              className="group relative block w-full text-left"
            >
              <span
                className={cx(
                  'absolute -left-6 top-1.5 h-3 w-3 rounded-full transition',
                  active
                    ? 'bg-[#d7d2d2] shadow-[0_0_12px_rgba(255,255,255,0.28)]'
                    : 'bg-white/[0.14] group-hover:bg-white/[0.3]',
                )}
              />
              <span
                className={cx(
                  'block text-[1.08rem] leading-7 tracking-[-0.035em] transition',
                  active ? 'text-white' : 'text-[#d5d0d0] group-hover:text-white',
                )}
              >
                {link.label}
              </span>
              <span className="mt-2 block text-[0.73rem] uppercase tracking-[0.2em] text-[#878181]">
                {link.meta}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function ChatPageContent() {
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
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

  const visibleMessages = useMemo(
    () => messages.filter((msg) => msg.id !== WELCOME_MESSAGE.id),
    [messages],
  );
  const userMessages = useMemo(
    () => visibleMessages.filter((msg) => msg.role === 'user'),
    [visibleMessages],
  );
  const starterSuggestions = useMemo(() => {
    const welcomeMessage = messages.find((msg) => msg.id === WELCOME_MESSAGE.id);
    return welcomeMessage?.suggestedReplies ?? [];
  }, [messages]);
  const messageOutlineLinks = useMemo<TimelineLink[]>(
    () =>
      userMessages.map((msg, index) => ({
        id: msg.id,
        label: formatOutlineLabel(msg.content, index + 1),
        meta: formatTimelineMeta(msg.timestamp, index),
      })),
    [userMessages],
  );
  const highlightedMessageId = selectedTimelineMessageId ?? activeMessageId;
  const showIntroState =
    !isLoadingSession && !sessionId && messages.length === 1 && messages[0]?.id === WELCOME_MESSAGE.id;
  const composerSuggestions = useMemo(() => {
    if (showIntroState) {
      return starterSuggestions;
    }

    const latestReplySet = [...visibleMessages]
      .reverse()
      .find((msg) => msg.role === 'assistant' && (msg.suggestedReplies?.length ?? 0) > 0);

    return latestReplySet?.suggestedReplies ?? [];
  }, [showIntroState, starterSuggestions, visibleMessages]);

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
        rootMargin: '-15% 0px -68% 0px',
        threshold: 0.1,
      },
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

  const handleContextMenu = useCallback((event: MouseEvent, msg: Message) => {
    event.preventDefault();

    if (msg.role !== 'assistant') {
      return;
    }

    const selectedText = window.getSelection()?.toString().trim();
    const textSelection = selectedText || msg.content;

    if (!textSelection) {
      return;
    }

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      text: textSelection,
      messageId: msg.id,
    });
  }, []);

  const openSaveModal = useCallback(
    (messageId: string, explicitText?: string) => {
      const assistantMessage = messages.find(
        (msg) => msg.id === messageId && msg.role === 'assistant',
      );
      const contentToSave = explicitText?.trim() || assistantMessage?.content.trim();

      if (!contentToSave) {
        toast.error('No content to save');
        return;
      }

      setTextToSave(contentToSave);
      setDefaultTitle(getLastUserPrompt(messages, messageId) || 'Saved from chat');
      setShowSaveModal(true);
      setContextMenu(null);
    },
    [messages],
  );

  const handleSaveToLibrary = useCallback(() => {
    if (!contextMenu) {
      return;
    }

    openSaveModal(contextMenu.messageId, contextMenu.text);
  }, [contextMenu, openSaveModal]);

  const handleSaveWithTitle = useCallback(async (title: string, content: string) => {
    if (!content || !content.trim()) {
      toast.error('No content to save');
      return;
    }

    try {
      const result = await saveToLibraryAction(content, title);

      if (result.success) {
        toast.success(
          result.created
            ? `Saved "${title}" to library`
            : `"${title}" already exists in library`,
        );
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
    setHistoryDrawerOpen(false);
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
      top: Math.max(0, getTargetScrollTop(container, target) - 24),
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
    [handleJumpToMessage],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#131313] text-[#e2e2e2]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-white/[0.04] blur-[130px]" />
        <div className="absolute bottom-[-18%] right-[-10%] h-[30rem] w-[30rem] rounded-full bg-white/[0.03] blur-[150px]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-50 h-16 bg-[#151515]/66 backdrop-blur-2xl">
        <div className="mx-auto flex h-full max-w-[1800px] items-center justify-between px-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setHistoryDrawerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-[#b9b3b3] transition hover:bg-white/[0.08] hover:text-white lg:hidden"
              aria-label="Open Ask Vault navigation"
            >
              <AskVaultIcon name="menu" className="h-4 w-4" />
            </button>

            <Link href="/chat" className="transition-opacity hover:opacity-80">
              <div className="text-[1.85rem] font-black tracking-[-0.075em] text-[#c7c2c2]">
                Ask Vault
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsOutlineDrawerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-[#b9b3b3] transition hover:bg-white/[0.08] hover:text-white xl:hidden"
              aria-label="Open prompt timeline"
            >
              <AskVaultIcon name="timeline" className="h-4 w-4" />
            </button>
            <Link
              href="/today"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-[#b9b3b3] transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Open Research"
            >
              <AskVaultIcon name="research" className="h-4 w-4" />
            </Link>
            <Link
              href="/ingest"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-[#b9b3b3] transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Add content"
            >
              <AskVaultIcon name="ingest" className="h-4 w-4" />
            </Link>
            <Link
              href="/agents"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#202020] text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#ddd7d7] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-[#2a2a2a]"
              aria-label="Open agents"
            >
              CV
            </Link>
          </div>
        </div>
      </header>

      <div className="fixed bottom-0 left-0 top-16 z-30 hidden w-[18.75rem] lg:block">
        <ChatHistorySidebar
          isOpen
          variant="desktop"
          onToggle={() => undefined}
          currentSessionId={sessionId}
          onNewChat={handleNewChatClick}
        />
      </div>

      <div className="fixed bottom-0 right-0 top-16 z-30 hidden w-[20rem] xl:block">
        <aside className="flex h-full flex-col bg-[#1a1a1a]/92 px-8 pb-8 pt-12 backdrop-blur-2xl shadow-[-18px_0_48px_rgba(0,0,0,0.24)]">
          <div className="pb-8">
            <p className="text-[0.9rem] font-semibold uppercase tracking-[0.28em] text-[#d0cbcb]">
              Prompt Timeline
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-2">
            <PromptTimeline
              links={messageOutlineLinks}
              highlightedMessageId={highlightedMessageId}
              onJump={handleJumpToMessage}
            />
          </div>
        </aside>
      </div>

      <div
        ref={messageScrollContainerRef}
        className="relative h-screen overflow-y-auto pt-16 lg:pl-[18.75rem] xl:pr-[20rem]"
      >
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1020px] flex-col px-4 pb-[14rem] pt-5 sm:px-6 lg:px-8">
          {isLoadingSession ? (
            <div className="flex min-h-[calc(100vh-16rem)] flex-1 items-center justify-center py-10">
              <div className="w-full rounded-[2rem] bg-[#171717]/94 px-8 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.42)] ring-1 ring-white/[0.04]">
                <div className="flex items-center gap-4 text-[#d7d2d2]">
                  <LoadingSpinner className="h-5 w-5 border-white/[0.14] border-t-[#d0d0d0]" />
                  <div>
                    <p className="text-sm font-semibold text-white">Loading conversation</p>
                    <p className="mt-1 text-sm text-[#8e8a8a]">
                      Restoring the selected Ask Vault session.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : showIntroState ? (
            <div className="flex min-h-[calc(100vh-15rem)] flex-1 items-center justify-center py-10">
              <section className="relative flex min-h-[34rem] w-full flex-col items-center justify-center overflow-hidden rounded-[2.2rem] bg-[#151515] px-8 py-16 text-center shadow-[0_24px_90px_rgba(0,0,0,0.44)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.045),transparent_38%)]" />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,rgba(255,255,255,0.02),transparent)]" />
                <div className="relative z-10">
                  <div className="mx-auto mb-9">
                    <AgentOrb />
                  </div>
                  <h1 className="mx-auto max-w-[14ch] text-[clamp(3rem,6vw,4.75rem)] font-black tracking-[-0.085em] text-[#d0cbcb]">
                    How can I assist your research?
                  </h1>
                  <p className="mx-auto mt-6 max-w-[32rem] text-[clamp(1.1rem,2vw,1.3rem)] leading-9 text-[#b1abab]">
                    Access your saved materials, query the knowledge base, or synthesize new
                    insights.
                  </p>
                </div>
              </section>
            </div>
          ) : (
            <div className="flex-1 py-8">
              <div className="space-y-8">
                {visibleMessages.map((msg) => (
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
                    className={cx(
                      'flex gap-4 scroll-mt-24',
                      msg.role === 'user' ? 'justify-end' : 'justify-start',
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="pt-1">
                        <AgentOrb compact />
                      </div>
                    ) : null}

                    <div className={cx('flex max-w-[88%] flex-col', msg.role === 'user' ? 'items-end' : '')}>
                      <div
                        className={cx(
                          'mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em]',
                          msg.role === 'user' ? 'text-[#8f8888]' : 'text-[#a39d9d]',
                        )}
                      >
                        {msg.role === 'user' ? 'You' : 'Ask Vault'}
                      </div>

                      <div
                        className={cx(
                          'overflow-hidden rounded-[1.55rem] px-5 py-4 text-[0.98rem] leading-8 shadow-[0_12px_28px_rgba(0,0,0,0.2)]',
                          msg.role === 'user'
                            ? 'rounded-tr-[0.5rem] bg-gradient-to-br from-[#8f8a8a] to-[#c5c0c0] text-[#171717]'
                            : msg.status === 'failed'
                              ? 'bg-[#3b1717] text-[#ffe1de]'
                              : 'rounded-tl-[0.5rem] bg-[#1a1a1a] text-[#ece7e7]',
                        )}
                        onContextMenu={(event) => handleContextMenu(event, msg)}
                        style={{ cursor: 'text', userSelect: 'text' }}
                      >
                        {msg.role === 'assistant' ? (
                          <MarkdownMessage content={msg.content} />
                        ) : (
                          <>{msg.content}</>
                        )}
                      </div>

                      {msg.role === 'assistant' && msg.status !== 'failed' ? (
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[0.78rem] text-[#8d8787]">
                          <button
                            type="button"
                            onClick={() => openSaveModal(msg.id)}
                            className="rounded-full bg-white/[0.04] px-3 py-1.5 text-[#d4cece] transition hover:bg-white/[0.08] hover:text-white"
                          >
                            Save to library
                          </button>
                          <span>Select text first if you only want to save an excerpt.</span>
                        </div>
                      ) : null}

                      {msg.role === 'assistant' && msg.status === 'failed' && msg.failedRequestContent ? (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => {
                              void retryFailedMessage(msg.id);
                            }}
                            disabled={isLoading}
                            className="rounded-full bg-[#5d2a2a] px-3 py-1.5 text-sm font-medium text-[#ffe1de] transition hover:bg-[#753232] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isLoading ? 'Retrying...' : 'Retry'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}

                {!isLoadingSession && isTyping ? (
                  <div className="flex justify-start gap-4">
                    <div className="pt-1">
                      <AgentOrb compact />
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-[#1a1a1a] px-4 py-3">
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#a7a1a1] [animation-delay:-0.3s]" />
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#a7a1a1] [animation-delay:-0.15s]" />
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#a7a1a1]" />
                    </div>
                  </div>
                ) : null}

                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:left-[18.75rem] xl:right-[20rem]">
        <div className="bg-[linear-gradient(to_top,rgba(19,19,19,0.98),rgba(19,19,19,0.96),transparent)] px-4 pb-5 pt-14 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1020px] pointer-events-auto">
            {composerSuggestions.length > 0 ? (
              <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                {composerSuggestions.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => {
                      void handleSubmit(undefined, reply);
                    }}
                    className="rounded-full bg-[#1a1a1a] px-4 py-2.5 text-[0.88rem] tracking-[-0.02em] text-[#d7d1d1] transition hover:bg-[#232323] hover:text-white"
                  >
                    {reply}
                  </button>
                ))}

                {!showIntroState ? (
                  <button
                    type="button"
                    onClick={() => {
                      void refreshSuggestions();
                    }}
                    disabled={isRefreshingSuggestions}
                    className="rounded-full bg-white/[0.04] px-4 py-2.5 text-[0.82rem] uppercase tracking-[0.18em] text-[#989191] transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                  >
                    {isRefreshingSuggestions ? 'Refreshing…' : 'Refresh'}
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-[1.7rem] bg-[#101010]/94 px-4 py-3 shadow-[0_22px_60px_rgba(0,0,0,0.38)] ring-1 ring-white/[0.04] backdrop-blur-2xl">
              <div className="flex items-end gap-3">
                <button
                  type="button"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#c8c2c2] transition hover:bg-white/[0.05] hover:text-white"
                  aria-label="Attachments are not available in Ask Vault"
                  title="Ask Vault currently uses saved material already in the vault"
                >
                  <AskVaultIcon name="paperclip" className="h-5 w-5" />
                </button>

                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your saved material..."
                  rows={1}
                  aria-label="Ask Vault prompt"
                  className="max-h-[220px] min-h-[52px] w-full resize-none border-0 bg-transparent py-3 text-[1.02rem] leading-7 text-[#ece7e7] placeholder:text-[#706a6a] focus:outline-none focus:ring-0"
                />

                <button
                  type="button"
                  onClick={() => {
                    void handleSubmit();
                  }}
                  disabled={!message.trim() || isLoading}
                  aria-label="Send message"
                  className={cx(
                    'mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition',
                    message.trim() && !isLoading
                      ? 'bg-gradient-to-b from-[#8f8a8a] to-[#c8c3c3] text-[#151515] shadow-[0_12px_24px_rgba(0,0,0,0.22)] hover:from-[#a6a0a0] hover:to-[#d9d4d4]'
                      : 'cursor-not-allowed bg-white/[0.04] text-[#5f5a5a]',
                  )}
                >
                  {isLoading ? (
                    <LoadingSpinner className="h-5 w-5 border-black/20 border-t-[#151515]" />
                  ) : (
                    <AskVaultIcon name="send" className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-3 text-center text-[0.72rem] uppercase tracking-[0.22em] text-[#767070]">
              AI agent may produce inaccurate information. Verify critical data.
            </div>
          </div>
        </div>
      </div>

      {contextMenu ? (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onSaveToLibrary={handleSaveToLibrary}
        />
      ) : null}

      <SaveToLibraryModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveWithTitle}
        defaultText={textToSave}
        defaultTitle={defaultTitle}
      />

      <Drawer
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        title="Ask Vault navigation"
        description="Recent sessions and quick access to related workspaces."
        panelClassName="max-w-[22rem] border-0 bg-transparent shadow-none"
        contentClassName="p-0"
      >
        <div className="h-full">
          <ChatHistorySidebar
            isOpen={historyDrawerOpen}
            variant="drawer"
            onToggle={() => setHistoryDrawerOpen(false)}
            currentSessionId={sessionId}
            onNewChat={handleNewChatClick}
          />
        </div>
      </Drawer>

      <Drawer
        open={isOutlineDrawerOpen}
        onClose={() => setIsOutlineDrawerOpen(false)}
        title="Prompt timeline"
        description="Jump through the questions in this session."
        panelClassName="max-w-[22rem] bg-[#1a1a1a]"
        contentClassName="pt-2"
      >
        <PromptTimeline
          links={messageOutlineLinks}
          highlightedMessageId={highlightedMessageId}
          onJump={handleJumpToMessageFromDrawer}
        />
      </Drawer>

      <ToastContainer />
    </div>
  );
}
