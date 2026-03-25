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
  content: "Ask about the documents, reports, and concepts already stored in your vault. This is best for follow-up questions after you add content or run research workflows.",
  suggestedReplies: [
    'What is in my vault right now?',
    'Summarize my latest report',
    'Show documents about ai systems',
    'Help me clean up my notes',
  ],
  timestamp: new Date(),
};
