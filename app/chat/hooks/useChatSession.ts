'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, FormEvent, KeyboardEvent, RefObject, SetStateAction } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { chatAction } from '../../actions/chatAction';
import { generateSuggestedPrompts } from '../../actions/suggestedPromptsAction';
import { getSessionAction } from '../../actions/chatHistoryActions';
import { WELCOME_MESSAGE } from '../types';
import type { Message } from '../types';

type SubmitOptions = {
  failedMessageId?: string;
};

type UseChatSessionResult = {
  sessionId: string | null;
  message: string;
  messages: Message[];
  isLoading: boolean;
  isTyping: boolean;
  isLoadingSession: boolean;
  isRefreshingSuggestions: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  setMessage: Dispatch<SetStateAction<string>>;
  handleSubmit: (e?: FormEvent, overrideMessage?: string, options?: SubmitOptions) => Promise<void>;
  handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  retryFailedMessage: (failedMessageId: string) => Promise<void>;
  refreshSuggestions: () => Promise<void>;
  handleNewChat: () => void;
};

function createMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return Date.now().toString();
}

export function useChatSession(): UseChatSessionResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get('session');

  const [sessionId, setSessionId] = useState<string | null>(sessionIdFromUrl);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isRefreshingSuggestions, setIsRefreshingSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionIdFromUrl) {
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

  useEffect(() => {
    if (sessionIdFromUrl) return;

    const loadSuggestions = async () => {
      try {
        const suggestions = await generateSuggestedPrompts();
        if (suggestions && suggestions.length > 0) {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.role === 'assistant' && msg.id === 'welcome') {
                return { ...msg, suggestedReplies: suggestions };
              }
              return msg;
            }),
          );
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
    router.push('/chat');
  }, [router]);

  const refreshSuggestions = useCallback(async () => {
    setIsRefreshingSuggestions(true);
    try {
      const suggestions = await generateSuggestedPrompts();
      if (suggestions && suggestions.length > 0) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.role === 'assistant' && msg.suggestedReplies) {
              return { ...msg, suggestedReplies: suggestions };
            }
            return msg;
          }),
        );
      }
    } catch (error) {
      console.error('Failed to refresh suggestions:', error);
    } finally {
      setIsRefreshingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleSubmit = useCallback(
    async (e?: FormEvent, overrideMessage?: string, options?: SubmitOptions) => {
      e?.preventDefault();
      const messageToSend = overrideMessage ?? message;
      const normalizedMessage = messageToSend.trim();

      if (!normalizedMessage || isLoading) {
        return;
      }

      let shouldAppendUserMessage = true;
      let userMessageId: string | null = null;

      if (options?.failedMessageId) {
        const failedIndex = messages.findIndex(
          (msg) => msg.id === options.failedMessageId && msg.status === 'failed',
        );

        if (failedIndex >= 0) {
          const failedMessage = messages[failedIndex];
          const userMessageById =
            failedMessage.failedUserMessageId != null
              ? messages.find(
                (msg) => msg.id === failedMessage.failedUserMessageId && msg.role === 'user',
              )
              : null;
          const userMessageBeforeFailure =
            failedIndex > 0 && messages[failedIndex - 1]?.role === 'user'
              ? messages[failedIndex - 1]
              : null;
          const associatedUserMessage = userMessageById ?? userMessageBeforeFailure;

          if (associatedUserMessage && associatedUserMessage.content === normalizedMessage) {
            shouldAppendUserMessage = false;
            userMessageId = associatedUserMessage.id;
          }

          setMessages((prev) => prev.filter((msg) => msg.id !== options.failedMessageId));
        }
      }

      if (shouldAppendUserMessage) {
        userMessageId = createMessageId();
        const userMessage: Message = {
          id: userMessageId,
          role: 'user',
          content: normalizedMessage,
          timestamp: new Date(),
        };

        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== 'welcome');
          return [...filtered, userMessage];
        });
      } else if (!userMessageId) {
        userMessageId = createMessageId();
      }

      setMessage('');
      setIsLoading(true);
      setIsTyping(true);

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      try {
        const response = await chatAction({
          message: normalizedMessage,
          sessionId: sessionId,
          reuseLastUserMessage: !shouldAppendUserMessage,
        });
        setIsTyping(false);

        if (!sessionId && response.sessionId) {
          setSessionId(response.sessionId);
          router.push(`/chat?session=${response.sessionId}`, { scroll: false });
        }

        const assistantMessage: Message = {
          id: createMessageId(),
          role: 'assistant',
          content: response.content,
          suggestedReplies: response.suggestedReplies,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error('Chat error:', error);
        setIsTyping(false);

        const errorMessage: Message = {
          id: createMessageId(),
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          status: 'failed',
          failedRequestContent: normalizedMessage,
          failedUserMessageId: userMessageId,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        setIsTyping(false);
      }
    },
    [isLoading, message, messages, router, sessionId],
  );

  const retryFailedMessage = useCallback(
    async (failedMessageId: string) => {
      const failedMessage = messages.find(
        (msg) => msg.id === failedMessageId && msg.status === 'failed',
      );
      const retryText = failedMessage?.failedRequestContent?.trim();
      if (!retryText || isLoading) {
        return;
      }

      await handleSubmit(undefined, retryText, { failedMessageId });
    },
    [handleSubmit, isLoading, messages],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return {
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
  };
}
