'use server';

import { openAIExecutionService } from '@/server/ai/openai-execution-service';
import { buildPrompt } from '@/server/ai/prompt-builder';
import { AI_TASKS } from '@/server/ai/tasks';

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
    const shuffledCategories = shuffleArray(PROMPT_CATEGORIES);
    const prompt = buildPrompt({
      task: AI_TASKS.generatePromptSuggestions,
      systemInstructions: [
        {
          heading: 'Role',
          content: 'You generate suggested prompts about AI, LLMs, and productivity.',
        },
        {
          heading: 'Requirements',
          content: [
            'Generate 4 unique prompts, one from each provided category.',
            'Each prompt should be 4-10 words.',
            'Make them interesting and specific.',
            'Vary between questions, commands, and exploratory phrases.',
            'Return only an XML block with prompt elements.',
          ].join('\n'),
        },
      ],
      requestPayload: [
        {
          heading: 'Categories',
          content: [
            `1. ${shuffledCategories[0]}`,
            `2. ${shuffledCategories[1]}`,
            `3. ${shuffledCategories[2]}`,
            `4. ${shuffledCategories[3]}`,
          ].join('\n'),
        },
        {
          heading: 'Randomness Seed',
          content: String(Date.now()),
        },
      ],
    });
    const response = await openAIExecutionService.executeText({
      task: AI_TASKS.generatePromptSuggestions,
      prompt,
      temperature: 0.9,
    });
    const content = response.output;

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
