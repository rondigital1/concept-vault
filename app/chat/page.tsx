'use client';

import { useState, useRef, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { chatAction } from '../actions/chatAction';
import { saveToLibraryAction } from '../actions/saveToLibraryAction';
import { generateSuggestedPrompts } from '../actions/suggestedPromptsAction';
import { getSessionAction } from '../actions/chatHistoryActions';
import { ContextMenu } from '../components/ContextMenu';
import { SaveToLibraryModal } from '../components/SaveToLibraryModal';
import { toast, ToastContainer } from '../components/Toast';
import { ChatHistorySidebar } from './components/ChatHistorySidebar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestedReplies?: string[];
}

function isProbablyInlineCode(className?: string) {
  if (!className) {
    return false;
  }

  return !className.includes('language-');
}

function extractLanguage(className?: string) {
  if (!className) {
    return null;
  }

  const match = className.match(/language-([a-z0-9-]+)/i);

  if (!match) {
    return null;
  }

  return match[1];
}

function normalizeMarkdownForDisplay(raw: string | undefined | null) {
  if (!raw) return '';
  let text = raw;

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = text.replace(/\u00A0/g, ' ');
  text = text.trim();
  text = text.replace(/\n{3,}/g, '\n\n');

  return text;
}

type CodeCopyState = {
  copiedKey: string | null;
};

function MarkdownMessage(props: { content: string }) {
  const [copyState, setCopyState] = useState<CodeCopyState>({ copiedKey: null });

  const md = useMemo(() => {
    return normalizeMarkdownForDisplay(props.content);
  }, [props.content]);

  const components = useMemo(() => {
    return {
      a: ({ href, children }: any) => {
        const safeHref = typeof href === 'string' ? href : '';

        return (
          <a
            href={safeHref}
            target="_blank"
            rel="noreferrer"
            className="text-[#c66849] underline decoration-[#c66849]/40 underline-offset-2 hover:decoration-[#c66849]"
          >
            {children}
          </a>
        );
      },
      p: ({ children }: any) => {
        return <p className="my-3 whitespace-pre-wrap">{children}</p>;
      },
      ul: ({ children }: any) => {
        return <ul className="my-3 list-disc pl-6">{children}</ul>;
      },
      ol: ({ children }: any) => {
        return <ol className="my-3 list-decimal pl-6">{children}</ol>;
      },
      li: ({ children }: any) => {
        return <li className="my-1">{children}</li>;
      },
      h1: ({ children }: any) => {
        return <h1 className="mt-5 mb-2 text-xl font-semibold">{children}</h1>;
      },
      h2: ({ children }: any) => {
        return <h2 className="mt-5 mb-2 text-lg font-semibold">{children}</h2>;
      },
      h3: ({ children }: any) => {
        return <h3 className="mt-4 mb-2 text-base font-semibold">{children}</h3>;
      },
      blockquote: ({ children }: any) => {
        return (
          <blockquote className="my-3 border-l-2 border-stone-200 pl-4 text-stone-700">
            {children}
          </blockquote>
        );
      },
      code: ({ inline, className, children }: any) => {
        const text = String(children ?? '');

        if (inline || isProbablyInlineCode(className)) {
          return (
            <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[0.9em] text-stone-900 [&::selection]:bg-[#d97757]/30 [&::selection]:text-stone-900" style={{ userSelect: 'text' }}>
              {text}
            </code>
          );
        }

        const lang = extractLanguage(className) ?? 'text';
        const codeKey = `${lang}:${text.length}:${text.slice(0, 24)}`;
        const isCopied = copyState.copiedKey === codeKey;

        return (
          <div className="my-4 overflow-hidden rounded-lg border border-stone-200 bg-white [&_*::selection]:bg-[#d97757]/30 [&_*::selection]:text-stone-900">
            <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-3 py-2">
              <div className="text-xs font-semibold text-stone-600">{lang}</div>
              <button
                type="button"
                className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(text);
                    setCopyState({ copiedKey: codeKey });

                    window.setTimeout(() => {
                      setCopyState({ copiedKey: null });
                    }, 1200);
                  } catch {
                    // ignore
                  }
                }}
              >
                {isCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="max-w-full overflow-x-auto px-4 py-3 text-sm leading-6" style={{ userSelect: 'text' }}>
              <code className="font-mono text-stone-900" style={{ userSelect: 'text' }}>{text}</code>
            </pre>
          </div>
        );
      },
      table: ({ children }: any) => {
        return (
          <div className="my-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">{children}</table>
          </div>
        );
      },
      thead: ({ children }: any) => {
        return <thead className="bg-stone-50">{children}</thead>;
      },
      tbody: ({ children }: any) => {
        return <tbody className="bg-white">{children}</tbody>;
      },
      tr: ({ children }: any) => {
        return <tr className="border-b border-stone-200">{children}</tr>;
      },
      th: ({ children }: any) => {
        return <th className="px-3 py-2 text-left text-xs font-semibold text-stone-700">{children}</th>;
      },
      td: ({ children }: any) => {
        return <td className="px-3 py-2 align-top text-stone-800">{children}</td>;
      },
    };
  }, [copyState.copiedKey]);

  return (
    <div
      className="text-stone-800 [&_*::selection]:bg-[#d97757]/30 [&_*::selection]:text-stone-900"
      style={{ userSelect: 'text', cursor: 'text' }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={components as any}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Hello! I'm ready to help you explore your knowledge base. Ask me about your documents or concepts.",
  suggestedReplies: [
    "What is in my vault?",
    "Summarize my recent documents",
    "Help me organize my notes",
    "Show me random facts"
  ],
  timestamp: new Date(),
};

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get('session');

  const [sessionId, setSessionId] = useState<string | null>(sessionIdFromUrl);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; text: string; messageId: string } | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [textToSave, setTextToSave] = useState('');
  const [defaultTitle, setDefaultTitle] = useState('');
  const [isRefreshingSuggestions, setIsRefreshingSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load session from URL param
  useEffect(() => {
    const loadSession = async () => {
      if (!sessionIdFromUrl) {
        // Reset to welcome state for new chat
        setSessionId(null);
        setMessages([WELCOME_MESSAGE]);
        return;
      }

      setIsLoadingSession(true);
      try {
        const data = await getSessionAction(sessionIdFromUrl);
        if (data && data.messages.length > 0) {
          setSessionId(sessionIdFromUrl);
          const loadedMessages: Message[] = data.messages.map((m, idx) => ({
            id: `loaded-${idx}`,
            role: m.role,
            content: m.content,
            timestamp: new Date(),
          }));
          setMessages(loadedMessages);
        } else {
          // Session not found or empty, reset
          setSessionId(null);
          setMessages([WELCOME_MESSAGE]);
          router.replace('/chat');
        }
      } catch (error) {
        console.error('Failed to load session:', error);
        setSessionId(null);
        setMessages([WELCOME_MESSAGE]);
      } finally {
        setIsLoadingSession(false);
      }
    };

    loadSession();
  }, [sessionIdFromUrl, router]);

  // Load dynamic suggestions on mount (only for new chats)
  useEffect(() => {
    if (sessionIdFromUrl) return; // Skip for existing sessions

    const loadSuggestions = async () => {
      try {
        const suggestions = await generateSuggestedPrompts();
        if (suggestions && suggestions.length > 0) {
          setMessages(prev => prev.map(msg => {
            if (msg.role === 'assistant' && msg.id === 'welcome') {
              return { ...msg, suggestedReplies: suggestions };
            }
            return msg;
          }));
        }
      } catch (error) {
        console.error('Failed to load dynamic suggestions:', error);
      }
    };

    loadSuggestions();
  }, [sessionIdFromUrl]);

  const handleNewChat = useCallback(() => {
    setSessionId(null);
    setMessages([WELCOME_MESSAGE]);
    setSidebarOpen(false);
    router.push('/chat');
  }, [router]);

  const refreshSuggestions = useCallback(async () => {
    setIsRefreshingSuggestions(true);
    try {
      const suggestions = await generateSuggestedPrompts();
      if (suggestions && suggestions.length > 0) {
        setMessages(prev => prev.map(msg => {
          if (msg.role === 'assistant' && msg.suggestedReplies) {
            return { ...msg, suggestedReplies: suggestions };
          }
          return msg;
        }));
      }
    } catch (error) {
      console.error('Failed to refresh suggestions:', error);
    } finally {
      setIsRefreshingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleSubmit = async (e?: React.FormEvent, overrideMessage?: string) => {
    e?.preventDefault();
    const messageToSend = overrideMessage || message;

    if (!messageToSend.trim() || isLoading) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageToSend.trim(),
      timestamp: new Date(),
    };

    // Remove welcome message on first user message
    setMessages(prev => {
      const filtered = prev.filter(m => m.id !== 'welcome');
      return [...filtered, userMessage];
    });
    setMessage('');
    setIsLoading(true);
    setIsTyping(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await chatAction({
        message: userMessage.content,
        sessionId: sessionId,
      });
      setIsTyping(false);

      // Update session ID and URL on first message
      if (!sessionId && response.sessionId) {
        setSessionId(response.sessionId);
        router.push(`/chat?session=${response.sessionId}`, { scroll: false });
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.content,
        suggestedReplies: response.suggestedReplies,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setIsTyping(false);

      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
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
  };

  const handleSaveToLibrary = () => {
    if (!contextMenu) {
      return;
    }

    // Find the message that was right-clicked
    const messageIndex = messages.findIndex(m => m.id === contextMenu.messageId);

    // Find the most recent user message before this message (the original prompt)
    let userPrompt = '';
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userPrompt = messages[i].content;
        break;
      }
    }

    // Store the text and default title, then open the modal
    setTextToSave(contextMenu.text);
    setDefaultTitle(userPrompt || 'Saved from chat');
    setShowSaveModal(true);
    setContextMenu(null); // Close context menu
  };

  const handleSaveWithTitle = async (title: string, content: string) => {
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
  };

  return (
    <div className="flex h-[calc(100vh-73px)] bg-stone-50">
      {/* Sidebar */}
      <ChatHistorySidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentSessionId={sessionId}
        onNewChat={handleNewChat}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-none flex items-center justify-between px-6 py-4 bg-white border-b border-stone-200">
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle */}
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

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {isLoadingSession ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-stone-500">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
                  <span>Loading conversation...</span>
                </div>
              </div>
            ) : messages.map((msg) => (
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
            ))}

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

        {/* Input Area */}
        <div className="flex-none bg-white border-t border-stone-200 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-end gap-2 p-2 bg-stone-50 rounded-xl border border-stone-200">
              {/* Attachment Button */}
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

              {/* Send Button */}
              <button
                onClick={() => handleSubmit()}
                disabled={!message.trim() || isLoading}
                className={`mb-1 p-2 rounded-lg transition-all duration-200 ${message.trim() && !isLoading
                  ? 'bg-[#d97757] text-white shadow-sm hover:bg-[#c66849]'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white p-0.5" />
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

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onSaveToLibrary={handleSaveToLibrary}
          />
        )}

        {/* Save to Library Modal */}
        <SaveToLibraryModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={handleSaveWithTitle}
          defaultText={textToSave}
          defaultTitle={defaultTitle}
        />

        {/* Toast Notifications */}
        <ToastContainer />
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-screen bg-stone-50 items-center justify-center">
        <div className="flex items-center gap-3 text-stone-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
          <span>Loading...</span>
        </div>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
