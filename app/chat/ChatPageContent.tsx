'use client';

import { useCallback, useState } from 'react';
import { ContextMenu } from '../components/ContextMenu';
import { SaveToLibraryModal } from '../components/SaveToLibraryModal';
import { ToastContainer } from '../components/Toast';
import { ChatBackdrop } from './components/ChatBackdrop';
import { ChatComposer } from './components/ChatComposer';
import { ChatConversationViewport } from './components/ChatConversationViewport';
import { ChatDesktopRails } from './components/ChatDesktopRails';
import { ChatDrawers } from './components/ChatDrawers';
import { ChatHeader } from './components/ChatHeader';
import { useChatPageState } from './hooks/useChatPageState';
import { useChatSaveToLibrary } from './hooks/useChatSaveToLibrary';
import { useChatSession } from './hooks/useChatSession';
import { usePromptTimelineNavigation } from './hooks/usePromptTimelineNavigation';

export function ChatPageContent() {
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [isOutlineDrawerOpen, setIsOutlineDrawerOpen] = useState(false);

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
  const {
    visibleMessages,
    userMessages,
    messageOutlineLinks,
    showIntroState,
    composerSuggestions,
  } = useChatPageState({
    messages,
    sessionId,
    isLoadingSession,
  });
  const {
    highlightedMessageId,
    messageScrollContainerRef,
    userMessageRefs,
    jumpToMessage,
    resetTimelineState,
  } = usePromptTimelineNavigation(userMessages);
  const {
    contextMenu,
    showSaveModal,
    textToSave,
    defaultTitle,
    closeContextMenu,
    closeSaveModal,
    handleContextMenu,
    openSaveModal,
    handleSaveToLibrary,
    handleSaveWithTitle,
  } = useChatSaveToLibrary(messages);

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

      <ChatConversationViewport
        visibleMessages={visibleMessages}
        isLoadingSession={isLoadingSession}
        showIntroState={showIntroState}
        isTyping={isTyping}
        isLoading={isLoading}
        messageScrollContainerRef={messageScrollContainerRef}
        userMessageRefs={userMessageRefs}
        messagesEndRef={messagesEndRef}
        onContextMenu={handleContextMenu}
        onSaveMessage={openSaveModal}
        onRetryFailedMessage={retryMessage}
      />

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
          onClose={closeContextMenu}
          onSaveToLibrary={handleSaveToLibrary}
        />
      ) : null}

      <SaveToLibraryModal
        isOpen={showSaveModal}
        onClose={closeSaveModal}
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
