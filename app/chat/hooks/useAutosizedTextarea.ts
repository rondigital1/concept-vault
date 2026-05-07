'use client';

import { useEffect } from 'react';
import type { RefObject } from 'react';

const DEFAULT_MAX_TEXTAREA_HEIGHT = 200;

export function resetTextareaHeight(textareaRef: RefObject<HTMLTextAreaElement | null>) {
  if (textareaRef.current) {
    textareaRef.current.style.height = 'auto';
  }
}

export function useAutosizedTextarea(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  value: string,
  maxHeight = DEFAULT_MAX_TEXTAREA_HEIGHT,
) {
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, maxHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [maxHeight, textareaRef, value]);
}
