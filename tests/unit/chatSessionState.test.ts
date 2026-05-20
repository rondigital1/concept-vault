import { describe, expect, it } from 'vitest';
import {
  applyWelcomeSuggestions,
  buildLoadedMessages,
  findRetryUserMessageId,
  refreshExistingSuggestions,
} from '@/app/chat/hooks/chatSessionState';
import { WELCOME_MESSAGE, type Message } from '@/app/chat/types';

function message(overrides: Partial<Message>): Message {
  return {
    id: 'message-1',
    role: 'assistant',
    content: 'Response',
    timestamp: new Date('2026-05-19T12:00:00.000Z'),
    ...overrides,
  };
}

describe('chat session state helpers', () => {
  it('normalizes loaded history into chat messages', () => {
    const loaded = buildLoadedMessages([
      { role: 'user', content: 'What is saved?' },
      { role: 'assistant', content: 'A report and two notes.' },
    ]);

    expect(loaded.map(({ id, role, content }) => ({ id, role, content }))).toEqual([
      { id: 'loaded-0', role: 'user', content: 'What is saved?' },
      { id: 'loaded-1', role: 'assistant', content: 'A report and two notes.' },
    ]);
    expect(loaded[0].timestamp).toBeInstanceOf(Date);
  });

  it('updates only the welcome or existing suggestion messages', () => {
    const suggestedReplies = ['Open latest report', 'Find sources'];
    const messages = [
      WELCOME_MESSAGE,
      message({ id: 'assistant-1', suggestedReplies: ['Old suggestion'] }),
      message({ id: 'assistant-2', suggestedReplies: undefined }),
    ];

    expect(applyWelcomeSuggestions(messages, suggestedReplies)[0].suggestedReplies).toEqual(
      suggestedReplies,
    );
    expect(refreshExistingSuggestions(messages, suggestedReplies).map((entry) => entry.suggestedReplies)).toEqual([
      suggestedReplies,
      suggestedReplies,
      undefined,
    ]);
  });

  it('reuses the original user message when retrying a failed assistant response', () => {
    const messages = [
      message({ id: 'user-1', role: 'user', content: 'Summarize reports' }),
      message({
        id: 'failed-1',
        status: 'failed',
        failedRequestContent: 'Summarize reports',
        failedUserMessageId: 'user-1',
      }),
    ];

    expect(
      findRetryUserMessageId({
        failedMessageId: 'failed-1',
        messages,
        normalizedMessage: 'Summarize reports',
      }),
    ).toBe('user-1');
  });
});
