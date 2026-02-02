'use client';

import { useCallback, useState } from 'react';
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
    loading: () => <div className="animate-pulse h-4 bg-stone-200 rounded" />,
  }
);

export function ChatPageContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
    refreshSuggestions,
    handleNewChat,
  } = useChatSession();

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
    handleNewChat();
    setSidebarOpen(false);
  }, [handleNewChat]);

  return (
    <div className="flex h-[calc(100vh-73px)] bg-stone-50">
      <ChatHistorySidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentSessionId={sessionId}
        onNewChat={handleNewChatClick}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-none flex items-center justify-between px-6 py-4 bg-white border-b border-stone-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
              title="Toggle chat history"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="h-10 w-10 rounded-lg bg-[#d97757] flex items-center justify-center shadow-sm">
              <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-stone-800">Knowledge Assistant</h1>
              <p className="text-sm text-stone-500">Ask about your vault</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {isLoadingSession ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-stone-500">
                  <LoadingSpinner className="h-5 w-5 border-stone-300 border-t-stone-600" />
                  <span>Loading conversation...</span>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="shrink-0 h-8 w-8 rounded-full bg-[#f0f0ed] flex items-center justify-center mt-1">
                      <svg className="h-4 w-4 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14a1 1 0 1 1 1-1 1 1 0 0 1-1 1zm2.36-5.24a2 2 0 0 0 .64-1.76 2 2 0 0 0-4 0c0 .53.21 1.04.59 1.41a2 2 0 0 1 .59 1.41V12h2.36v-.36a4 4 0 0 0-1.18-2.88z" />
                      </svg>
                    </div>
                  )}

                  <div className={`max-w-[85%] space-y-1 ${msg.role === 'user' ? 'items-end flex flex-col' : 'text-stone-800 px-1 py-0.5'}`}>
                    <div className={`text-xs font-medium ${msg.role === 'user' ? 'text-stone-500' : 'text-stone-900'}`}>
                      {msg.role === 'user' ? 'You' : 'Assistant'}
                    </div>
                    <div
                      className={`text-[15px] leading-7 ${msg.role === 'user'
                        ? 'bg-[#EAEAE8] text-stone-800 px-4 py-2.5 rounded-2xl rounded-tr-sm [&::selection]:bg-[#d97757]/30 [&::selection]:text-stone-900'
                        : 'text-stone-800 px-1 py-0.5'
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
                    {msg.suggestedReplies && msg.suggestedReplies.length > 0 && (
                      <div className="mt-3 w-full">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-stone-500">Suggested prompts</span>
                          <button
                            onClick={refreshSuggestions}
                            disabled={isRefreshingSuggestions}
                            className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 transition-colors disabled:opacity-50"
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
                        <div className="grid grid-cols-2 gap-2">
                          {msg.suggestedReplies.map((reply, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                handleSubmit(undefined, reply);
                              }}
                              className="text-sm bg-stone-900 hover:bg-black text-white px-4 py-3 rounded-xl transition-all shadow-sm text-left flex items-center"
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
              <div className="flex gap-4 justify-start">
                <div className="shrink-0 h-8 w-8 rounded-full bg-[#f0f0ed] flex items-center justify-center mt-1">
                  <svg className="h-4 w-4 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14a1 1 0 1 1 1-1 1 1 0 0 1-1 1zm2.36-5.24a2 2 0 0 0 .64-1.76 2 2 0 0 0-4 0c0 .53.21 1.04.59 1.41a2 2 0 0 1 .59 1.41V12h2.36v-.36a4 4 0 0 0-1.18-2.88z" />
                  </svg>
                </div>
                <div className="flex items-center gap-1.5 h-8">
                  <div className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="flex-none bg-white border-t border-stone-200 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-end gap-2 p-2 bg-stone-50 rounded-xl border border-stone-200">
              <button
                type="button"
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors mb-0.5"
                title="Attach file"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message..."
                  rows={1}
                  className="w-full resize-none border-0 bg-transparent py-3 text-[15px] text-stone-900 placeholder:text-stone-400 focus:ring-0 focus:outline-none max-h-[200px]"
                  style={{ minHeight: '44px' }}
                />
              </div>

              <button
                onClick={() => handleSubmit()}
                disabled={!message.trim() || isLoading}
                className={`mb-1 p-2 rounded-lg transition-all duration-200 ${message.trim() && !isLoading
                  ? 'bg-[#d97757] text-white shadow-sm hover:bg-[#c66849]'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
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
            <div className="text-center pt-2">
              <p className="text-xs text-stone-400">Markdown supported (code blocks, lists, tables). AI Agent can make mistakes. Please verify important info.</p>
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
    </div>
  );
}
