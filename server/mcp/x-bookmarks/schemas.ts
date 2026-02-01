import { z } from 'zod';

// Input schemas
export const FetchBookmarksInputSchema = z.object({
  maxResults: z
    .number()
    .min(10)
    .max(100)
    .default(100)
    .describe('Number of bookmarks to fetch (10-100)'),
  saveToVault: z
    .boolean()
    .default(false)
    .describe('Import bookmarks to Concept Vault database'),
});

export const CheckApiUsageInputSchema = z.object({});

// Output schemas
export const BookmarkSchema = z.object({
  id: z.string(),
  text: z.string(),
  authorUsername: z.string(),
  authorName: z.string(),
  createdAt: z.string(),
  url: z.string(),
});

export const FetchBookmarksOutputSchema = z.object({
  bookmarks: z.array(BookmarkSchema),
  count: z.number(),
  savedCount: z.number().optional(),
  skippedCount: z.number().optional(),
});

export const CheckApiUsageOutputSchema = z.object({
  estimatedReadsUsed: z.number(),
  estimatedReadsRemaining: z.number(),
  monthlyLimit: z.number(),
  lastFetchDate: z.string().nullable(),
  currentMonth: z.string(),
});

// Types
export type FetchBookmarksInput = z.infer<typeof FetchBookmarksInputSchema>;
export type FetchBookmarksOutput = z.infer<typeof FetchBookmarksOutputSchema>;
export type CheckApiUsageInput = z.infer<typeof CheckApiUsageInputSchema>;
export type CheckApiUsageOutput = z.infer<typeof CheckApiUsageOutputSchema>;
export type Bookmark = z.infer<typeof BookmarkSchema>;
