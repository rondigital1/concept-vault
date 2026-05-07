'use client';

import { useCallback, useState, type MouseEvent } from 'react';
import { saveToLibraryAction } from '../../actions/saveToLibraryAction';
import { toast } from '../../components/Toast';
import { getLastUserPrompt } from '../chatPresentation';
import type { Message } from '../types';

type ContextMenuState = {
  x: number;
  y: number;
  text: string;
  messageId: string;
};

export function useChatSaveToLibrary(messages: Message[]) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [textToSave, setTextToSave] = useState('');
  const [defaultTitle, setDefaultTitle] = useState('');

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const closeSaveModal = useCallback(() => {
    setShowSaveModal(false);
  }, []);

  const handleContextMenu = useCallback((event: MouseEvent, message: Message) => {
    event.preventDefault();

    if (message.role !== 'assistant') {
      return;
    }

    const selectedText = window.getSelection()?.toString().trim();
    const textSelection = selectedText || message.content;

    if (!textSelection) {
      return;
    }

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      text: textSelection,
      messageId: message.id,
    });
  }, []);

  const openSaveModal = useCallback(
    (messageId: string, explicitText?: string) => {
      const assistantMessage = messages.find((message) => {
        return message.id === messageId && message.role === 'assistant';
      });
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

  return {
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
  };
}
