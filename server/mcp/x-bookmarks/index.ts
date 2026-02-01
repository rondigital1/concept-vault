#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { fetchBookmarks } from './x-client';
import { importBookmarksToVault } from './vault-import';
import { recordRead, getUsage, hasQuotaRemaining } from './usage-tracker';
import type { FetchBookmarksOutput, CheckApiUsageOutput } from './schemas';

const server = new McpServer({
  name: 'x-bookmarks',
  version: '1.0.0',
});

// Tool: fetch_bookmarks
server.registerTool(
  'fetch_bookmarks',
  {
    description:
      'Fetch X (Twitter) bookmarks from authenticated user. WARNING: X Free Tier allows only 100 reads/month total. Use sparingly.',
    inputSchema: {
      maxResults: z
        .number()
        .min(10)
        .max(100)
        .default(100)
        .describe('Number of bookmarks to fetch (10-100, default 100)'),
      saveToVault: z
        .boolean()
        .default(false)
        .describe('Import bookmarks to Concept Vault database'),
    },
  },
  async ({
    maxResults,
    saveToVault,
  }): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
    // Check quota before making API call
    if (!hasQuotaRemaining()) {
      const usage = getUsage();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Monthly API quota exhausted',
              estimatedReadsUsed: usage.estimatedReadsUsed,
              monthlyLimit: usage.monthlyLimit,
              currentMonth: usage.currentMonth,
              message:
                'X Free Tier allows 100 reads/month. Wait until next month or upgrade your plan.',
            }),
          },
        ],
      };
    }

    try {
      // Fetch bookmarks from X API
      const bookmarks = await fetchBookmarks(maxResults ?? 100);

      // Record the API read
      recordRead();

      const result: FetchBookmarksOutput = {
        bookmarks,
        count: bookmarks.length,
      };

      // Optionally save to vault
      if (saveToVault && bookmarks.length > 0) {
        const importResult = await importBookmarksToVault(bookmarks);
        result.savedCount = importResult.savedCount;
        result.skippedCount = importResult.skippedCount;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message }),
          },
        ],
      };
    }
  }
);

// Tool: check_api_usage
server.registerTool(
  'check_api_usage',
  {
    description:
      'Check remaining X API free tier quota (100 reads/month). Shows estimated usage based on local tracking.',
  },
  async (): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
    const usage = getUsage();
    const result: CheckApiUsageOutput = usage;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[x-bookmarks-mcp] Server started');
}

main().catch((error) => {
  console.error('[x-bookmarks-mcp] Fatal error:', error);
  process.exit(1);
});
