'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, FormEvent, KeyboardEvent, RefObject, SetStateAction } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { chatAction } from '../../actions/chatAction';
import {
  createAssistantMessage,
  createChatMessageId,
  createFailedAssistantMessage,
  createUserMessage,
  findFailedRetryMatch,
  removeWelcomeMessage,
} from '../chatSessionMessages';
import { WELCOME_MESSAGE } from '../types';
import type { Message } from '../types';
import { resetTextareaHeight, useAutosizedTextarea } from './useAutosizedTextarea';
import { useChatSessionLoader } from './useChatSessionLoader';
import { useChatSuggestions } from './useChatSuggestions';

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

export function useChatSession(): UseChatSessionResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get('session');

  const [sessionId, setSessionId] = useState<string | null>(sessionIdFromUrl);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleMissingSession = useCallback(() => {
    router.replace('/chat');
  }, [router]);

  const isLoadingSession = useChatSessionLoader({
    sessionIdFromUrl,
    setSessionId,
    setMessages,
    onMissingSession: handleMissingSession,
  });
  const { isRefreshingSuggestions, refreshSuggestions } = useChatSuggestions({
    shouldLoadInitialSuggestions: !sessionIdFromUrl,
    setMessages,
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleNewChat = useCallback(() => {
    setSessionId(null);
    setMessages([WELCOME_MESSAGE]);
    router.push('/chat');
  }, [router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useAutosizedTextarea(textareaRef, message);

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
        const retryMatch = findFailedRetryMatch(messages, options.failedMessageId, normalizedMessage);
        if (retryMatch.foundFailedMessage) {
          if (retryMatch.reusableUserMessageId) {
            shouldAppendUserMessage = false;
            userMessageId = retryMatch.reusableUserMessageId;
          }

          setMessages((prev) => prev.filter((msg) => msg.id !== options.failedMessageId));
        }
      }

      if (shouldAppendUserMessage) {
        userMessageId = createChatMessageId();
        const userMessage = createUserMessage(normalizedMessage, userMessageId);

        setMessages((prev) => {
          return [...removeWelcomeMessage(prev), userMessage];
        });
      } else if (!userMessageId) {
        userMessageId = createChatMessageId();
      }

      setMessage('');
      setIsLoading(true);
      setIsTyping(true);

      resetTextareaHeight(textareaRef);

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

        const assistantMessage = createAssistantMessage(
          response.content,
          response.suggestedReplies,
        );
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error('Chat error:', error);
        setIsTyping(false);

        setMessages((prev) => [
          ...prev,
          createFailedAssistantMessage(normalizedMessage, userMessageId),
        ]);
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
