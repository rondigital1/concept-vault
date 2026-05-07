'use client';

import type { MouseEvent, MutableRefObject, RefObject } from 'react';
import type { Message } from '../types';
import { ChatMessageList } from './ChatMessageList';

type Props = {
  visibleMessages: Message[];
  isLoadingSession: boolean;
  showIntroState: boolean;
  isTyping: boolean;
  isLoading: boolean;
  messageScrollContainerRef: RefObject<HTMLDivElement | null>;
  userMessageRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onContextMenu: (event: MouseEvent, message: Message) => void;
  onSaveMessage: (messageId: string) => void;
  onRetryFailedMessage: (messageId: string) => void;
};

export function ChatConversationViewport({
  visibleMessages,
  isLoadingSession,
  showIntroState,
  isTyping,
  isLoading,
  messageScrollContainerRef,
  userMessageRefs,
  messagesEndRef,
  onContextMenu,
  onSaveMessage,
  onRetryFailedMessage,
}: Props) {
  return (
    <div
      ref={messageScrollContainerRef}
      className="relative h-screen overflow-y-auto pt-16 lg:pl-[18.75rem] xl:pr-[20rem]"
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1020px] flex-col px-4 pb-[14rem] pt-5 sm:px-6 lg:px-8">
        <ChatMessageList
          visibleMessages={visibleMessages}
          isLoadingSession={isLoadingSession}
          showIntroState={showIntroState}
          isTyping={isTyping}
          isLoading={isLoading}
          userMessageRefs={userMessageRefs}
          messagesEndRef={messagesEndRef}
          onContextMenu={onContextMenu}
          onSaveMessage={onSaveMessage}
          onRetryFailedMessage={onRetryFailedMessage}
        />
      </div>
    </div>
  );
}
