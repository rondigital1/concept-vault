export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestedReplies?: string[];
  status?: 'failed';
  failedRequestContent?: string;
  failedUserMessageId?: string;
};

export const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Hello! I'm ready to help you explore your knowledge base. Ask me about your documents or concepts.",
  suggestedReplies: [
    'What is in my vault?',
    'Summarize my recent documents',
    'Help me organize my notes',
    'Show me random facts',
  ],
  timestamp: new Date(),
};
