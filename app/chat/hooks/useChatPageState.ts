'use client';

import { useMemo } from 'react';
import {
  formatOutlineLabel,
  formatTimelineMeta,
  type TimelineLink,
} from '../chatPresentation';
import { WELCOME_MESSAGE } from '../types';
import type { Message } from '../types';

type UseChatPageStateArgs = {
  messages: Message[];
  sessionId: string | null;
  isLoadingSession: boolean;
};

export function useChatPageState({
  messages,
  sessionId,
  isLoadingSession,
}: UseChatPageStateArgs) {
  const visibleMessages = useMemo(
    () => messages.filter((message) => message.id !== WELCOME_MESSAGE.id),
    [messages],
  );
  const userMessages = useMemo(
    () => visibleMessages.filter((message) => message.role === 'user'),
    [visibleMessages],
  );
  const starterSuggestions = useMemo(() => {
    const welcomeMessage = messages.find((message) => message.id === WELCOME_MESSAGE.id);
    return welcomeMessage?.suggestedReplies ?? [];
  }, [messages]);
  const messageOutlineLinks = useMemo<TimelineLink[]>(
    () =>
      userMessages.map((message, index) => ({
        id: message.id,
        label: formatOutlineLabel(message.content, index + 1),
        meta: formatTimelineMeta(message.timestamp, index),
      })),
    [userMessages],
  );
  const showIntroState =
    !isLoadingSession &&
    !sessionId &&
    messages.length === 1 &&
    messages[0]?.id === WELCOME_MESSAGE.id;
  const composerSuggestions = useMemo(() => {
    if (showIntroState) {
      return starterSuggestions;
    }

    const latestReplySet = [...visibleMessages]
      .reverse()
      .find((message) => {
        return message.role === 'assistant' && (message.suggestedReplies?.length ?? 0) > 0;
      });

    return latestReplySet?.suggestedReplies ?? [];
  }, [showIntroState, starterSuggestions, visibleMessages]);

  return {
    visibleMessages,
    userMessages,
    messageOutlineLinks,
    showIntroState,
    composerSuggestions,
  };
}
