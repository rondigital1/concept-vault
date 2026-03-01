/**
 * Next.js instrumentation hook.
 * Runs once when the Next.js server starts.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

let isInitialized = false;

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (isInitialized) {
      return;
    }

    console.log('[Instrumentation] Initializing database schema...');

    try {
      // Check if DATABASE_URL is set
      if (!process.env.DATABASE_URL) {
        console.error('[Instrumentation] DATABASE_URL environment variable is not set');
        console.error('[Instrumentation] Please create a .env file with DATABASE_URL=postgresql://knowledge:knowledge@localhost:5432/concept_vault');
        console.error('[Instrumentation] Or copy .env.example to .env and update it');
        isInitialized = true;
        return;
      }

      // Import db only in node runtime to avoid edge bundle pulling node-only deps.
      const { client, ensureSchema } = await import('@/db');
      const result = await ensureSchema(client);

      if (result.ok) {
        console.log('[Instrumentation] Database schema initialized successfully');
      } else {
        console.error('[Instrumentation] Schema initialization failed:', result.error || 'Unknown error');
        // Don't throw - allow app to start even if schema init fails
        // This enables debugging and manual fixes
      }

      isInitialized = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('[Instrumentation] Unexpected error during schema init:', errorMessage);
      if (errorStack) {
        console.error('[Instrumentation] Stack trace:', errorStack);
      }
    }
  }
}
