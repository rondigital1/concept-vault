import { describe, expect, it } from 'vitest';
import {
  formatOutlineLabel,
  formatTimelineMeta,
  getLastUserPrompt,
} from '@/app/chat/chatPresentation';
import type { Message } from '@/app/chat/types';

function makeMessage(overrides: Partial<Message>): Message {
  return {
    id: 'message-1',
    role: 'user',
    content: '',
    timestamp: new Date('2026-05-06T12:00:00.000Z'),
    ...overrides,
  };
}

describe('chat presentation helpers', () => {
  it('formats prompt outline labels for empty, short, and long prompts', () => {
    expect(formatOutlineLabel('   ', 2)).toBe('Message 2');
    expect(formatOutlineLabel('Summarize my latest report', 1)).toBe('Summarize my latest report');
    expect(formatOutlineLabel('a'.repeat(60), 1)).toBe(`${'a'.repeat(52)}...`);
  });

  it('finds the user prompt immediately before an assistant response', () => {
    const messages: Message[] = [
      makeMessage({ id: 'user-1', role: 'user', content: 'What changed?' }),
      makeMessage({ id: 'assistant-1', role: 'assistant', content: 'A summary.' }),
      makeMessage({ id: 'assistant-2', role: 'assistant', content: 'More detail.' }),
    ];

    expect(getLastUserPrompt(messages, 'assistant-2')).toBe('What changed?');
    expect(getLastUserPrompt(messages, 'user-1')).toBe('');
  });

  it('falls back to a stable prompt label for invalid timestamps', () => {
    expect(formatTimelineMeta(new Date('not-a-date'), 4)).toBe('Prompt 05');
  });
});
