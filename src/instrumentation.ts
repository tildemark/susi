/**
 * Next.js Instrumentation Hook
 * Runs once on server startup (Node.js runtime only).
 * Used to register background cron jobs.
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only run in the Node.js server environment (not in Edge runtime or during build)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerCronJobs } = await import('./lib/cron');
    registerCronJobs();
  }
}
