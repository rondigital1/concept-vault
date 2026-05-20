import { WELCOME_MESSAGE, type Message } from '../types';

type StoredSessionMessage = {
  role: Message['role'];
  content: string;
};

export function createMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return Date.now().toString();
}

export function buildLoadedMessages(messages: StoredSessionMessage[]): Message[] {
  return messages.map((message, index) => ({
    id: `loaded-${index}`,
    role: message.role,
    content: message.content,
    timestamp: new Date(),
  }));
}

export function applyWelcomeSuggestions(messages: Message[], suggestions: string[]): Message[] {
  return messages.map((message) => {
    if (message.role === 'assistant' && message.id === WELCOME_MESSAGE.id) {
      return { ...message, suggestedReplies: suggestions };
    }

    return message;
  });
}

export function refreshExistingSuggestions(messages: Message[], suggestions: string[]): Message[] {
  return messages.map((message) => {
    if (message.role === 'assistant' && message.suggestedReplies) {
      return { ...message, suggestedReplies: suggestions };
    }

    return message;
  });
}

export function findRetryUserMessageId({
  failedMessageId,
  messages,
  normalizedMessage,
}: {
  failedMessageId: string;
  messages: Message[];
  normalizedMessage: string;
}): string | null {
  const failedIndex = messages.findIndex(
    (message) => message.id === failedMessageId && message.status === 'failed',
  );

  if (failedIndex < 0) {
    return null;
  }

  const failedMessage = messages[failedIndex];
  const userMessageById =
    failedMessage.failedUserMessageId != null
      ? messages.find(
        (message) => message.id === failedMessage.failedUserMessageId && message.role === 'user',
      )
      : null;
  const userMessageBeforeFailure =
    failedIndex > 0 && messages[failedIndex - 1]?.role === 'user'
      ? messages[failedIndex - 1]
      : null;
  const associatedUserMessage = userMessageById ?? userMessageBeforeFailure;

  if (associatedUserMessage && associatedUserMessage.content === normalizedMessage) {
    return associatedUserMessage.id;
  }

  return null;
}
