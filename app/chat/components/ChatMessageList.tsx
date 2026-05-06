'use client';

import dynamic from 'next/dynamic';
import type { MouseEvent, MutableRefObject, RefObject } from 'react';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { cx } from '../chatPresentation';
import type { Message } from '../types';
import { AgentOrb } from './AgentOrb';

const MarkdownMessage = dynamic(
  () => import('./MarkdownMessage').then((mod) => mod.MarkdownMessage),
  {
    loading: () => <div className="h-4 animate-pulse rounded bg-white/[0.08]" />,
  },
);

export function ChatMessageList({
  visibleMessages,
  isLoadingSession,
  showIntroState,
  isTyping,
  isLoading,
  userMessageRefs,
  messagesEndRef,
  onContextMenu,
  onSaveMessage,
  onRetryFailedMessage,
}: {
  visibleMessages: Message[];
  isLoadingSession: boolean;
  showIntroState: boolean;
  isTyping: boolean;
  isLoading: boolean;
  userMessageRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onContextMenu: (event: MouseEvent, message: Message) => void;
  onSaveMessage: (messageId: string) => void;
  onRetryFailedMessage: (messageId: string) => void;
}) {
  if (isLoadingSession) {
    return <LoadingConversationState />;
  }

  if (showIntroState) {
    return <IntroConversationState />;
  }

  return (
    <div className="flex-1 py-8">
      <div className="space-y-8">
        {visibleMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLoading={isLoading}
            userMessageRefs={userMessageRefs}
            onContextMenu={onContextMenu}
            onSaveMessage={onSaveMessage}
            onRetryFailedMessage={onRetryFailedMessage}
          />
        ))}

        {!isLoadingSession && isTyping ? (
          <TypingIndicator />
        ) : null}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

function LoadingConversationState() {
  return (
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
  );
}

function IntroConversationState() {
  return (
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
  );
}

function MessageBubble({
  message,
  isLoading,
  userMessageRefs,
  onContextMenu,
  onSaveMessage,
  onRetryFailedMessage,
}: {
  message: Message;
  isLoading: boolean;
  userMessageRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  onContextMenu: (event: MouseEvent, message: Message) => void;
  onSaveMessage: (messageId: string) => void;
  onRetryFailedMessage: (messageId: string) => void;
}) {
  return (
    <div
      id={message.role === 'user' ? `chat-message-${message.id}` : undefined}
      data-message-id={message.role === 'user' ? message.id : undefined}
      ref={
        message.role === 'user'
          ? (node) => {
              if (node) {
                userMessageRefs.current[message.id] = node;
              } else {
                delete userMessageRefs.current[message.id];
              }
            }
          : undefined
      }
      className={cx(
        'flex gap-4 scroll-mt-24',
        message.role === 'user' ? 'justify-end' : 'justify-start',
      )}
    >
      {message.role === 'assistant' ? (
        <div className="pt-1">
          <AgentOrb compact />
        </div>
      ) : null}

      <div className={cx('flex max-w-[88%] flex-col', message.role === 'user' ? 'items-end' : '')}>
        <div
          className={cx(
            'mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em]',
            message.role === 'user' ? 'text-[#8f8888]' : 'text-[#a39d9d]',
          )}
        >
          {message.role === 'user' ? 'You' : 'Ask Vault'}
        </div>

        <div
          className={cx(
            'overflow-hidden rounded-[1.55rem] px-5 py-4 text-[0.98rem] leading-8 shadow-[0_12px_28px_rgba(0,0,0,0.2)]',
            message.role === 'user'
              ? 'rounded-tr-[0.5rem] bg-gradient-to-br from-[#8f8a8a] to-[#c5c0c0] text-[#171717]'
              : message.status === 'failed'
                ? 'bg-[#3b1717] text-[#ffe1de]'
                : 'rounded-tl-[0.5rem] bg-[#1a1a1a] text-[#ece7e7]',
          )}
          onContextMenu={(event) => onContextMenu(event, message)}
          style={{ cursor: 'text', userSelect: 'text' }}
        >
          {message.role === 'assistant' ? (
            <MarkdownMessage content={message.content} />
          ) : (
            <>{message.content}</>
          )}
        </div>

        {message.role === 'assistant' && message.status !== 'failed' ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[0.78rem] text-[#8d8787]">
            <button
              type="button"
              onClick={() => onSaveMessage(message.id)}
              className="rounded-full bg-white/[0.04] px-3 py-1.5 text-[#d4cece] transition hover:bg-white/[0.08] hover:text-white"
            >
              Save to library
            </button>
            <span>Select text first if you only want to save an excerpt.</span>
          </div>
        ) : null}

        {message.role === 'assistant' && message.status === 'failed' && message.failedRequestContent ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                onRetryFailedMessage(message.id);
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
  );
}

function TypingIndicator() {
  return (
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
  );
}
