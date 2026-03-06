export const appConfig = {
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  privacyMode: process.env.APP_PRIVACY_MODE_DEFAULT || 'standard',
} as const;

export type PrivacyMode = 'strict' | 'standard' | 'permissive';
