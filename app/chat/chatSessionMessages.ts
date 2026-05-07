import { WELCOME_MESSAGE } from './types';
import type { Message } from './types';

type LoadedSessionMessage = {
  role: Message['role'];
  content: string;
};

type FailedRetryMatch = {
  foundFailedMessage: boolean;
  reusableUserMessageId: string | null;
};

export function createChatMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return Date.now().toString();
}

export function buildLoadedSessionMessages(messages: LoadedSessionMessage[]): Message[] {
  return messages.map((message, index) => ({
    id: `loaded-${index}`,
    role: message.role,
    content: message.content,
    timestamp: new Date(),
  }));
}

export function createUserMessage(content: string, id = createChatMessageId()): Message {
  return {
    id,
    role: 'user',
    content,
    timestamp: new Date(),
  };
}

export function createAssistantMessage(content: string, suggestedReplies: string[]): Message {
  return {
    id: createChatMessageId(),
    role: 'assistant',
    content,
    suggestedReplies,
    timestamp: new Date(),
  };
}

export function createFailedAssistantMessage(
  content: string,
  failedUserMessageId: string | null,
): Message {
  const failedMessage: Message = {
    id: createChatMessageId(),
    role: 'assistant',
    content: 'Sorry, I encountered an error processing your request. Please try again.',
    status: 'failed',
    failedRequestContent: content,
    timestamp: new Date(),
  };

  if (failedUserMessageId) {
    return { ...failedMessage, failedUserMessageId };
  }

  return failedMessage;
}

export function removeWelcomeMessage(messages: Message[]): Message[] {
  return messages.filter((message) => message.id !== WELCOME_MESSAGE.id);
}

export function applyWelcomeSuggestions(messages: Message[], suggestions: string[]): Message[] {
  return messages.map((message) => {
    if (message.role === 'assistant' && message.id === WELCOME_MESSAGE.id) {
      return { ...message, suggestedReplies: suggestions };
    }

    return message;
  });
}

export function applyRefreshedSuggestions(messages: Message[], suggestions: string[]): Message[] {
  return messages.map((message) => {
    if (message.role === 'assistant' && message.suggestedReplies) {
      return { ...message, suggestedReplies: suggestions };
    }

    return message;
  });
}

export function findFailedRetryMatch(
  messages: Message[],
  failedMessageId: string,
  normalizedMessage: string,
): FailedRetryMatch {
  const failedIndex = messages.findIndex(
    (message) => message.id === failedMessageId && message.status === 'failed',
  );

  if (failedIndex < 0) {
    return { foundFailedMessage: false, reusableUserMessageId: null };
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
    return { foundFailedMessage: true, reusableUserMessageId: associatedUserMessage.id };
  }

  return { foundFailedMessage: true, reusableUserMessageId: null };
}
