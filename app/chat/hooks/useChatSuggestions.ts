'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { generateSuggestedPrompts } from '../../actions/suggestedPromptsAction';
import { applyRefreshedSuggestions, applyWelcomeSuggestions } from '../chatSessionMessages';
import type { Message } from '../types';

type UseChatSuggestionsArgs = {
  shouldLoadInitialSuggestions: boolean;
  setMessages: Dispatch<SetStateAction<Message[]>>;
};

export function useChatSuggestions({
  shouldLoadInitialSuggestions,
  setMessages,
}: UseChatSuggestionsArgs) {
  const [isRefreshingSuggestions, setIsRefreshingSuggestions] = useState(false);

  useEffect(() => {
    if (!shouldLoadInitialSuggestions) {
      return;
    }

    const loadSuggestions = async () => {
      try {
        const suggestions = await generateSuggestedPrompts();
        if (suggestions && suggestions.length > 0) {
          setMessages((messages) => applyWelcomeSuggestions(messages, suggestions));
        }
      } catch (error) {
        console.error('Failed to load dynamic suggestions:', error);
      }
    };

    void loadSuggestions();
  }, [setMessages, shouldLoadInitialSuggestions]);

  const refreshSuggestions = useCallback(async () => {
    setIsRefreshingSuggestions(true);
    try {
      const suggestions = await generateSuggestedPrompts();
      if (suggestions && suggestions.length > 0) {
        setMessages((messages) => applyRefreshedSuggestions(messages, suggestions));
      }
    } catch (error) {
      console.error('Failed to refresh suggestions:', error);
    } finally {
      setIsRefreshingSuggestions(false);
    }
  }, [setMessages]);

  return {
    isRefreshingSuggestions,
    refreshSuggestions,
  };
}
