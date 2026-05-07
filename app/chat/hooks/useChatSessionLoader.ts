'use client';

import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { getSessionAction } from '../../actions/chatHistoryActions';
import { buildLoadedSessionMessages } from '../chatSessionMessages';
import { WELCOME_MESSAGE } from '../types';
import type { Message } from '../types';

type UseChatSessionLoaderArgs = {
  sessionIdFromUrl: string | null;
  setSessionId: Dispatch<SetStateAction<string | null>>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  onMissingSession: () => void;
};

export function useChatSessionLoader({
  sessionIdFromUrl,
  setSessionId,
  setMessages,
  onMissingSession,
}: UseChatSessionLoaderArgs) {
  const [isLoadingSession, setIsLoadingSession] = useState(false);

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
          setMessages(buildLoadedSessionMessages(data.messages));
        } else {
          setSessionId(null);
          setMessages([WELCOME_MESSAGE]);
          onMissingSession();
        }
      } catch (error) {
        console.error('Failed to load session:', error);
        setSessionId(null);
        setMessages([WELCOME_MESSAGE]);
      } finally {
        setIsLoadingSession(false);
      }
    };

    void loadSession();
  }, [onMissingSession, sessionIdFromUrl, setMessages, setSessionId]);

  return isLoadingSession;
}
