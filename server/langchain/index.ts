/**
 * LangChain integration module.
 *
 * Provides model factories, schemas, callbacks, and memory for LangChain/LangGraph agents.
 */

// Model factory
export { createChatModel, createExtractionModel, createGenerationModel } from './models';
export type { ModelOptions } from './models';

// Schemas
export * from './schemas';

// Callbacks
export { RunStepCallbackHandler, createRunStepCallback } from './callbacks/runStepAdapter';
export type { RunStepAdapterOptions } from './callbacks/runStepAdapter';

// Memory
export { PostgresChatMessageHistory, createChatHistory, getMessageCount, deleteOldSessions } from './memory/postgresHistory';

// Tools
export { createTavilySearchTool, executeTavilySearch } from './tools/tavily.tool';
