'use client';

import type { MouseEvent, MutableRefObject, RefObject } from 'react';
import type { Message } from '../types';
import {
  IntroConversationState,
  LoadingConversationState,
  TypingIndicator,
} from './ChatConversationStates';
import { ChatMessageBubble } from './ChatMessageBubble';

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
        {visibleMessages.map((message) => (
          <ChatMessageBubble
            key={message.id}
            message={message}
            isLoading={isLoading}
            userMessageRefs={userMessageRefs}
            onContextMenu={onContextMenu}
            onSaveMessage={onSaveMessage}
            onRetryFailedMessage={onRetryFailedMessage}
          />
        ))}

        {!isLoadingSession && isTyping ? <TypingIndicator /> : null}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
