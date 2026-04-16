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

    console.log('[Instrumentation] Verifying database schema...');

    try {
      // Check if DATABASE_URL is set
      if (!process.env.DATABASE_URL) {
        console.error('[Instrumentation] DATABASE_URL environment variable is not set');
        console.error('[Instrumentation] Please create a .env file with DATABASE_URL=postgresql://knowledge:knowledge@localhost:5432/concept_vault');
        console.error('[Instrumentation] Or copy .env.example to .env and update it');
        throw new Error('DATABASE_URL is required before serving traffic');
      }

      // Import db only in node runtime to avoid edge bundle pulling node-only deps.
      const { assertSchemaReady, client } = await import('@/db');
      const status = await assertSchemaReady(client);
      console.log(
        `[Instrumentation] Database schema verified at version ${status.currentVersion ?? 'none'}`,
      );

      isInitialized = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('[Instrumentation] Schema verification failed:', errorMessage);
      if (errorStack) {
        console.error('[Instrumentation] Stack trace:', errorStack);
      }
      throw error;
    }
  }
}
