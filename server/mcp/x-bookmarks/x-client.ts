import { TwitterApi } from 'twitter-api-v2';
import type { Bookmark } from './schemas';

let clientInstance: TwitterApi | null = null;

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function getClient(): Promise<TwitterApi> {
  if (clientInstance) {
    return clientInstance;
  }

  const accessToken = getEnvVar('X_ACCESS_TOKEN');
  const refreshToken = process.env.X_REFRESH_TOKEN;
  const clientId = process.env.X_CLIENT_ID;

  // Create client with access token
  clientInstance = new TwitterApi(accessToken);

  // If we have refresh credentials, try to refresh the token
  if (refreshToken && clientId) {
    try {
      const refreshed = await new TwitterApi({
        clientId,
        clientSecret: process.env.X_CLIENT_SECRET,
      }).refreshOAuth2Token(refreshToken);

      clientInstance = new TwitterApi(refreshed.accessToken);

      // Log new tokens for manual update if needed
      console.error('[x-client] Token refreshed. New access token available.');
      if (refreshed.refreshToken) {
        console.error('[x-client] New refresh token available.');
      }
    } catch (err) {
      // Fall back to existing access token
      console.error('[x-client] Token refresh failed, using existing token:', err);
    }
  }

  return clientInstance;
}

export async function fetchBookmarks(maxResults: number): Promise<Bookmark[]> {
  const client = await getClient();
  const bookmarks: Bookmark[] = [];

  // Get authenticated user ID
  const me = await client.v2.me();
  const userId = me.data.id;

  // Fetch bookmarks with user expansion for author info
  const result = await client.v2.bookmarks({
    max_results: Math.min(maxResults, 100),
    expansions: ['author_id'],
    'tweet.fields': ['created_at', 'text', 'author_id'],
    'user.fields': ['username', 'name'],
  });

  // Create a map of user IDs to user data
  const userMap = new Map<string, { username: string; name: string }>();
  if (result.includes?.users) {
    for (const user of result.includes.users) {
      userMap.set(user.id, { username: user.username, name: user.name });
    }
  }

  // Transform tweets to bookmarks
  const tweets = Array.isArray(result.data) ? result.data : [];
  for (const tweet of tweets) {
    const author = userMap.get(tweet.author_id ?? '') ?? {
      username: 'unknown',
      name: 'Unknown',
    };

    bookmarks.push({
      id: tweet.id,
      text: tweet.text,
      authorUsername: author.username,
      authorName: author.name,
      createdAt: tweet.created_at ?? new Date().toISOString(),
      url: `https://x.com/${author.username}/status/${tweet.id}`,
    });
  }

  return bookmarks;
}

export function resetClient(): void {
  clientInstance = null;
}
