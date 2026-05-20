'use client';

import { useCallback, useMemo, useState, type MouseEvent } from 'react';
import { saveToLibraryAction } from '../actions/saveToLibraryAction';
import { ContextMenu } from '../components/ContextMenu';
import { SaveToLibraryModal } from '../components/SaveToLibraryModal';
import { toast, ToastContainer } from '../components/Toast';
import {
  formatOutlineLabel,
  formatTimelineMeta,
  getLastUserPrompt,
  type TimelineLink,
} from './chatPresentation';
import { ChatBackdrop } from './components/ChatBackdrop';
import { ChatComposer } from './components/ChatComposer';
import { ChatDesktopRails } from './components/ChatDesktopRails';
import { ChatDrawers } from './components/ChatDrawers';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessageList } from './components/ChatMessageList';
import { useChatSession } from './hooks/useChatSession';
import { usePromptTimelineNavigation } from './hooks/usePromptTimelineNavigation';
import { WELCOME_MESSAGE, type Message } from './types';

type ContextMenuState = {
  x: number;
  y: number;
  text: string;
  messageId: string;
};

export function ChatPageContent() {
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [isOutlineDrawerOpen, setIsOutlineDrawerOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [textToSave, setTextToSave] = useState('');
  const [defaultTitle, setDefaultTitle] = useState('');

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
  const {
    highlightedMessageId,
    messageScrollContainerRef,
    userMessageRefs,
    jumpToMessage,
    resetTimelineState,
  } = usePromptTimelineNavigation(userMessages);
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
    resetTimelineState();
    handleNewChat();
    setHistoryDrawerOpen(false);
    setIsOutlineDrawerOpen(false);
  }, [handleNewChat, resetTimelineState]);

  const handleJumpToMessageFromDrawer = useCallback(
    (messageId: string) => {
      jumpToMessage(messageId);
      setIsOutlineDrawerOpen(false);
    },
    [jumpToMessage],
  );

  const submitPrompt = useCallback(
    (prompt?: string) => {
      void handleSubmit(undefined, prompt);
    },
    [handleSubmit],
  );

  const refreshComposerSuggestions = useCallback(() => {
    void refreshSuggestions();
  }, [refreshSuggestions]);

  const retryMessage = useCallback(
    (messageId: string) => {
      void retryFailedMessage(messageId);
    },
    [retryFailedMessage],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#131313] text-[#e2e2e2]">
      <ChatBackdrop />

      <ChatHeader
        onOpenHistory={() => setHistoryDrawerOpen(true)}
        onOpenTimeline={() => setIsOutlineDrawerOpen(true)}
      />

      <ChatDesktopRails
        sessionId={sessionId}
        timelineLinks={messageOutlineLinks}
        highlightedMessageId={highlightedMessageId}
        onNewChat={handleNewChatClick}
        onJumpToMessage={jumpToMessage}
      />

      <div
        ref={messageScrollContainerRef}
        className="relative h-screen overflow-y-auto pt-16 lg:pl-[18.75rem] xl:pr-[20rem]"
      >
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1020px] flex-col px-4 pb-[14rem] pt-5 sm:px-6 lg:px-8">
          <ChatMessageList
            visibleMessages={visibleMessages}
            isLoadingSession={isLoadingSession}
            showIntroState={showIntroState}
            introSuggestions={starterSuggestions}
            isTyping={isTyping}
            isLoading={isLoading}
            userMessageRefs={userMessageRefs}
            messagesEndRef={messagesEndRef}
            onContextMenu={handleContextMenu}
            onSaveMessage={openSaveModal}
            onRetryFailedMessage={retryMessage}
            onSubmitPrompt={submitPrompt}
          />
        </div>
      </div>

      <ChatComposer
        suggestions={composerSuggestions}
        showIntroState={showIntroState}
        isRefreshingSuggestions={isRefreshingSuggestions}
        message={message}
        isLoading={isLoading}
        textareaRef={textareaRef}
        setMessage={setMessage}
        onKeyDown={handleKeyDown}
        onSubmitPrompt={submitPrompt}
        onRefreshSuggestions={refreshComposerSuggestions}
      />

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

      <ChatDrawers
        historyDrawerOpen={historyDrawerOpen}
        outlineDrawerOpen={isOutlineDrawerOpen}
        sessionId={sessionId}
        timelineLinks={messageOutlineLinks}
        highlightedMessageId={highlightedMessageId}
        onCloseHistory={() => setHistoryDrawerOpen(false)}
        onCloseOutline={() => setIsOutlineDrawerOpen(false)}
        onNewChat={handleNewChatClick}
        onJumpFromDrawer={handleJumpToMessageFromDrawer}
      />

      <ToastContainer />
    </div>
  );
}
