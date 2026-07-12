import cron from 'node-cron';
import { leaseService } from './services/lease.service';
import { notificationService } from './services/notification.service';

/**
 * Register all SUSI background cron jobs.
 * Called once at server startup via src/instrumentation.ts.
 */
export function registerCronJobs() {
  // Run daily at 8:00 AM (server local time)
  // Checks for leases whose billing date is within 5 days and alerts landlord
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Running daily meter-reading reminder check...');
    try {
      const dueLeases = await leaseService.getLeasesDueForMeterReading(5);

      if (dueLeases.length === 0) {
        console.log('[CRON] No leases due for meter reading within 5 days.');
        return;
      }

      const unitList = dueLeases
        .map((l) => `• Room ${l.unit.roomNumber} — Tenant: ${l.tenant.firstName} ${l.tenant.lastName}`)
        .join('\n');

      const message = `SUSI Meter Reading Reminder\n\n${dueLeases.length} unit(s) have billing due within the next 5 days. Please gather meter readings:\n\n${unitList}\n\nLog in to SUSI to submit readings and generate billing statements.`;

      await notificationService.notifyLandlord(message, 'Action Required: Meter Readings Due Soon');

      console.log(`[CRON] Meter reading reminder sent for ${dueLeases.length} unit(s).`);
    } catch (err) {
      console.error('[CRON] Meter reading reminder failed:', err);
    }
  });

  console.log('[CRON] SUSI background jobs registered (daily @ 8:00 AM).');
}
