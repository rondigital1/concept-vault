import { describe, expect, it } from 'vitest';
import {
  applyRefreshedSuggestions,
  applyWelcomeSuggestions,
  findFailedRetryMatch,
  removeWelcomeMessage,
} from '@/app/chat/chatSessionMessages';
import { WELCOME_MESSAGE, type Message } from '@/app/chat/types';

function makeMessage(overrides: Partial<Message>): Message {
  return {
    id: 'message-1',
    role: 'assistant',
    content: '',
    timestamp: new Date('2026-05-06T12:00:00.000Z'),
    ...overrides,
  };
}

describe('chat session message helpers', () => {
  it('updates only the welcome message with initial suggestions', () => {
    const messages: Message[] = [
      WELCOME_MESSAGE,
      makeMessage({ id: 'assistant-1', suggestedReplies: ['Old'] }),
    ];

    const updated = applyWelcomeSuggestions(messages, ['New']);

    expect(updated[0]?.suggestedReplies).toEqual(['New']);
    expect(updated[1]?.suggestedReplies).toEqual(['Old']);
  });

  it('refreshes suggestions on assistant messages that already expose replies', () => {
    const messages: Message[] = [
      makeMessage({ id: 'assistant-1', suggestedReplies: ['Old'] }),
      makeMessage({ id: 'assistant-2', suggestedReplies: undefined }),
      makeMessage({ id: 'user-1', role: 'user' }),
    ];

    const updated = applyRefreshedSuggestions(messages, ['Next']);

    expect(updated[0]?.suggestedReplies).toEqual(['Next']);
    expect(updated[1]?.suggestedReplies).toBeUndefined();
    expect(updated[2]?.suggestedReplies).toBeUndefined();
  });

  it('removes only the welcome message before the first user prompt is appended', () => {
    const messages = [
      WELCOME_MESSAGE,
      makeMessage({ id: 'assistant-1' }),
      makeMessage({ id: 'user-1', role: 'user' }),
    ];

    expect(removeWelcomeMessage(messages).map((message) => message.id)).toEqual([
      'assistant-1',
      'user-1',
    ]);
  });

  it('finds the reusable user message when retrying a failed assistant response', () => {
    const messages = [
      makeMessage({ id: 'user-1', role: 'user', content: 'Retry this' }),
      makeMessage({
        id: 'failed-1',
        status: 'failed',
        failedRequestContent: 'Retry this',
        failedUserMessageId: 'user-1',
      }),
    ];

    expect(findFailedRetryMatch(messages, 'failed-1', 'Retry this')).toEqual({
      foundFailedMessage: true,
      reusableUserMessageId: 'user-1',
    });
  });
});
