'use client';

import dynamic from 'next/dynamic';
import type { MouseEvent, MutableRefObject } from 'react';
import { cx } from '../chatPresentation';
import type { Message } from '../types';
import { AgentOrb } from './AgentOrb';

const MarkdownMessage = dynamic(
  () => import('./MarkdownMessage').then((mod) => mod.MarkdownMessage),
  {
    loading: () => <div className="h-4 animate-pulse rounded bg-white/[0.08]" />,
  },
);

type Props = {
  message: Message;
  isLoading: boolean;
  userMessageRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  onContextMenu: (event: MouseEvent, message: Message) => void;
  onSaveMessage: (messageId: string) => void;
  onRetryFailedMessage: (messageId: string) => void;
};

export function ChatMessageBubble({
  message,
  isLoading,
  userMessageRefs,
  onContextMenu,
  onSaveMessage,
  onRetryFailedMessage,
}: Props) {
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

        <ChatMessageActions
          message={message}
          isLoading={isLoading}
          onSaveMessage={onSaveMessage}
          onRetryFailedMessage={onRetryFailedMessage}
        />
      </div>
    </div>
  );
}

function ChatMessageActions({
  message,
  isLoading,
  onSaveMessage,
  onRetryFailedMessage,
}: {
  message: Message;
  isLoading: boolean;
  onSaveMessage: (messageId: string) => void;
  onRetryFailedMessage: (messageId: string) => void;
}) {
  if (message.role === 'assistant' && message.status !== 'failed') {
    return (
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
    );
  }

  if (message.role === 'assistant' && message.status === 'failed' && message.failedRequestContent) {
    return (
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
    );
  }

  return null;
}
