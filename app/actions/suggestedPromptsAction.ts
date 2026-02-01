'use server';

import { createChatModel } from '@/server/langchain/models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const PROMPT_CATEGORIES = [
  'a random interesting fact about AI or machine learning',
  'a practical LLM tip or prompt engineering technique',
  'an AI agent workflow or automation idea',
  'a productivity hack using AI tools',
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function generateSuggestedPrompts(): Promise<string[]> {
  try {
    const model = createChatModel({ temperature: 0.9 });
    const shuffledCategories = shuffleArray(PROMPT_CATEGORIES);

    const messages = [
      new SystemMessage(`You are an AI knowledge assistant specializing in AI, LLMs, and productivity.
Generate 4 unique and engaging question prompts, one from each category below. Be creative and vary your suggestions each time.

Categories (in order):
1. ${shuffledCategories[0]}
2. ${shuffledCategories[1]}
3. ${shuffledCategories[2]}
4. ${shuffledCategories[3]}

Requirements:
- Each prompt should be 4-10 words
- Make them interesting and specific (e.g. "What is chain-of-thought prompting?" not just "Tell me about prompts")
- Vary between questions, commands, and exploratory phrases
- Be creative and different each time

Format the output as an XML block like this:
<prompts>
  <prompt>Question 1</prompt>
  <prompt>Question 2</prompt>
  <prompt>Question 3</prompt>
  <prompt>Question 4</prompt>
</prompts>
Do not include any other text.`),
      new HumanMessage(`Generate 4 fresh, creative suggested prompts. Current timestamp for randomness: ${Date.now()}`)
    ];

    const response = await model.invoke(messages);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

    const promptsMatch = content.match(/<prompts>([\s\S]*?)<\/prompts>/);
    if (promptsMatch && promptsMatch[1]) {
      const promptsBlock = promptsMatch[1];
      const matches = promptsBlock.matchAll(/<prompt>(.*?)<\/prompt>/g);
      return Array.from(matches, (m: RegExpMatchArray) => m[1].trim());
    }

    return getFallbackPrompts();
  } catch (error) {
    console.error('Failed to generate suggested prompts:', error);
    return getFallbackPrompts();
  }
}

function getFallbackPrompts(): string[] {
  const fallbacks = [
    // AI Facts
    'What is the transformer architecture?',
    'Explain attention mechanisms in LLMs',
    'How does GPT generate text?',
    'What is reinforcement learning from human feedback?',
    // LLM Tips
    'Best practices for prompt engineering',
    'How to use system prompts effectively',
    'Tips for reducing LLM hallucinations',
    'When to use few-shot vs zero-shot prompting',
    // Agent Workflows
    'How to build an AI research agent',
    'Explain the ReAct agent pattern',
    'Best tools for LLM orchestration',
    'How do multi-agent systems work?',
    // Productivity
    'AI tools for automating repetitive tasks',
    'How to use AI for code review',
    'Best AI summarization techniques',
    'Workflow automation with LLMs',
  ];
  return shuffleArray(fallbacks).slice(0, 4);
}
