'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getTargetScrollTop } from '../chatPresentation';
import type { Message } from '../types';

export function usePromptTimelineNavigation(userMessages: Message[]) {
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [selectedTimelineMessageId, setSelectedTimelineMessageId] = useState<string | null>(null);
  const messageScrollContainerRef = useRef<HTMLDivElement>(null);
  const userMessageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimeoutRef = useRef<number | null>(null);
  const highlightedMessageId = selectedTimelineMessageId ?? activeMessageId;

  const resetTimelineState = useCallback(() => {
    if (programmaticScrollTimeoutRef.current !== null) {
      window.clearTimeout(programmaticScrollTimeoutRef.current);
      programmaticScrollTimeoutRef.current = null;
    }

    isProgrammaticScrollRef.current = false;
    setActiveMessageId(null);
    setSelectedTimelineMessageId(null);
    userMessageRefs.current = {};
  }, []);

  useEffect(() => {
    if (userMessages.length === 0) {
      resetTimelineState();
      return;
    }

    const userMessageIds = new Set(userMessages.map((msg) => msg.id));
    Object.keys(userMessageRefs.current).forEach((messageId) => {
      if (!userMessageIds.has(messageId)) {
        delete userMessageRefs.current[messageId];
      }
    });

    const nextActiveMessageId =
      activeMessageId && userMessageIds.has(activeMessageId)
        ? activeMessageId
        : (userMessages[userMessages.length - 1]?.id ?? null);
    if (nextActiveMessageId !== activeMessageId) {
      setActiveMessageId(nextActiveMessageId);
    }

    if (selectedTimelineMessageId && !userMessageIds.has(selectedTimelineMessageId)) {
      setSelectedTimelineMessageId(null);
    }
  }, [activeMessageId, resetTimelineState, selectedTimelineMessageId, userMessages]);

  useEffect(() => {
    const root = messageScrollContainerRef.current;
    if (!root || userMessages.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScrollRef.current) {
          return;
        }

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        const firstVisible = visible[0];
        if (!firstVisible) {
          return;
        }

        const messageId = (firstVisible.target as HTMLElement).dataset.messageId;
        if (messageId) {
          setActiveMessageId((current) => (current === messageId ? current : messageId));
        }
      },
      {
        root,
        rootMargin: '-15% 0px -68% 0px',
        threshold: 0.1,
      },
    );

    userMessages.forEach((msg) => {
      const node = userMessageRefs.current[msg.id];
      if (node) {
        observer.observe(node);
      }
    });

    return () => observer.disconnect();
  }, [userMessages]);

  useEffect(() => {
    return () => {
      if (programmaticScrollTimeoutRef.current !== null) {
        window.clearTimeout(programmaticScrollTimeoutRef.current);
      }
    };
  }, []);

  const jumpToMessage = useCallback((messageId: string) => {
    const target = userMessageRefs.current[messageId];
    const container = messageScrollContainerRef.current;
    if (!target || !container) {
      return;
    }

    if (programmaticScrollTimeoutRef.current !== null) {
      window.clearTimeout(programmaticScrollTimeoutRef.current);
    }

    isProgrammaticScrollRef.current = true;
    setActiveMessageId(messageId);
    setSelectedTimelineMessageId(messageId);
    container.scrollTo({
      top: Math.max(0, getTargetScrollTop(container, target) - 24),
      behavior: 'smooth',
    });

    programmaticScrollTimeoutRef.current = window.setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      programmaticScrollTimeoutRef.current = null;
    }, 700);
  }, []);

  return {
    highlightedMessageId,
    messageScrollContainerRef,
    userMessageRefs,
    jumpToMessage,
    resetTimelineState,
  };
}
