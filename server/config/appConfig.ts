export const appConfig = {
  modelProvider: (process.env.MODEL_PROVIDER || 'openai') as ModelProvider,
  modelName: process.env.MODEL_NAME || 'gpt-4o',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  privacyMode: process.env.APP_PRIVACY_MODE_DEFAULT || 'standard',
} as const;

export type ModelProvider = 'openai' | 'anthropic';
export type PrivacyMode = 'strict' | 'standard' | 'permissive';
