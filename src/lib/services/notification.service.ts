import { db } from '../db';
import { emailService } from './email.service';

export interface NotifyTenantOptions {
  notifyApp?: boolean;
  notifyEmail?: boolean;
  notifySms?: boolean;
}

export const notificationService = {
  /**
   * Notify a tenant across their configured channels.
   * Reads notify flags directly from the tenant record if no override provided.
   */
  async notifyTenant(
    tenantId: string,
    message: string,
    subject: string = 'SUSI Notification',
    overrideChannels?: NotifyTenantOptions
  ) {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) return;

    const channels = overrideChannels ?? {
      notifyApp: tenant.notifyApp,
      notifyEmail: tenant.notifyEmail,
      notifySms: tenant.notifySms,
    };

    const results: string[] = [];

    // In-app: create a TenantNote of type APP_NOTIFICATION
    if (channels.notifyApp) {
      try {
        await db.tenantNote.create({
          data: {
            tenantId,
            type: 'APP_NOTIFICATION',
            content: message,
          },
        });
        results.push('app');
      } catch (err) {
        console.error('[NotificationService] App notification failed:', err);
      }
    }

    // Email
    if (channels.notifyEmail && tenant.email) {
      try {
        await emailService.sendBillEmail(
          tenant.email,
          `${tenant.firstName} ${tenant.lastName}`,
          new Date().getMonth() + 1,
          new Date().getFullYear(),
          '',
          message
        );
        results.push('email');
      } catch (err) {
        console.error('[NotificationService] Email notification failed:', err);
      }
    }

    // SMS — stub until SMS provider is wired in
    if (channels.notifySms && tenant.phone) {
      console.log(
        `[NotificationService][SMS-STUB] Would send to ${tenant.phone}: ${message}`
      );
      // TODO: integrate SMS provider (Vonage / Twilio)
      // await smsClient.send({ to: tenant.phone, body: message });
      results.push('sms-stub');
    }

    return results;
  },

  /**
   * Notify the landlord (via email from BillingConfig) for system events
   * like upcoming meter-reading due dates.
   */
  async notifyLandlord(message: string, subject: string = 'SUSI Landlord Alert') {
    const config = await db.billingConfig.findUnique({ where: { id: 'global' } });
    if (!config?.landlordEmail) {
      console.log('[NotificationService] No landlord email configured. Skipping.');
      return;
    }

    try {
      await emailService.sendBillEmail(
        config.landlordEmail,
        config.landlordName || 'Landlord',
        new Date().getMonth() + 1,
        new Date().getFullYear(),
        '',
        message
      );
    } catch (err) {
      console.error('[NotificationService] Landlord email failed:', err);
    }
  },
};
