import { z } from 'zod';
import type { AIToolDefinition } from '@/server/ai/openai-execution-service';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';

export interface WebScoutTool {
  definition: AIToolDefinition;
  execute(args: unknown, scope?: WorkspaceScope): Promise<string>;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const httpUrlSchema = z.string().min(1).refine(isValidHttpUrl, {
  message: 'Expected a valid http(s) URL',
});

export const searchWebArgsSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().min(1).max(20).nullable(),
  includeDomains: z.array(z.string()).nullable().optional(),
  excludeDomains: z.array(z.string()).nullable().optional(),
});

export const evaluateResultArgsSchema = z.object({
  url: httpUrlSchema,
  title: z.string().min(1),
  snippet: z.string(),
  goal: z.string().min(1),
  publishedDate: z.string().nullable().optional(),
});

export const checkVaultDuplicateArgsSchema = z.object({
  urls: z.array(httpUrlSchema).min(1),
});

export const refineQueryArgsSchema = z.object({
  originalQuery: z.string().min(1),
  feedback: z.string().min(1),
});
