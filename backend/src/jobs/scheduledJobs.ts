// ============================================================
// jobs/scheduledJobs.ts — node-cron scheduled tasks
// Runs: document expiry alerts, DB cleanup, subscription checks
// ============================================================

import cron from 'node-cron';
import { prisma } from '../config/database';
import { createModuleLogger } from '../config/logger';
import { addNotificationJob, addEmailJob } from './queues';

const logger = createModuleLogger('scheduled-jobs');

export function startScheduledJobs(): void {
  // ─── CHECK EXPIRING DOCUMENTS (daily at 9am) ────────────
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running: document expiry check');
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringDocs = await prisma.driverDocument.findMany({
        where: {
          expiryDate: { lte: thirtyDaysFromNow, gte: new Date() },
          status: 'APPROVED',
        },
        include: { driver: { include: { user: true } } },
      });

      for (const doc of expiringDocs) {
        await addNotificationJob({
          tenantId: doc.tenantId,
          userId: doc.driver.userId,
          type: 'DOCUMENT_EXPIRY',
          title: 'Document Expiring Soon',
          body: `Your ${doc.type.replace('_', ' ')} expires on ${doc.expiryDate?.toLocaleDateString()}.`,
        });
      }

      logger.info(`Document expiry check complete`, { count: expiringDocs.length });
    } catch (error) {
      logger.error('Document expiry check failed', { error });
    }
  });

  // ─── CLEAN UP EXPIRED OTP CODES (every hour) ────────────
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await prisma.otpCode.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (result.count > 0) {
        logger.debug(`Cleaned ${result.count} expired OTP codes`);
      }
    } catch (error) {
      logger.error('OTP cleanup failed', { error });
    }
  });

  // ─── CLEAN UP EXPIRED REFRESH TOKENS (daily at midnight) ─
  cron.schedule('0 0 * * *', async () => {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      logger.debug(`Cleaned ${result.count} expired refresh tokens`);
    } catch (error) {
      logger.error('Refresh token cleanup failed', { error });
    }
  });

  // ─── CHECK TRIAL EXPIRATIONS (daily at 8am) ──────────────
  cron.schedule('0 8 * * *', async () => {
    try {
      const expiredTrials = await prisma.tenantSubscription.findMany({
        where: {
          status: 'TRIALING',
          currentPeriodEnd: { lt: new Date() },
        },
        include: { tenant: true },
      });

      for (const sub of expiredTrials) {
        await prisma.tenantSubscription.update({
          where: { id: sub.id },
          data: { status: 'CANCELLED' },
        });
        await prisma.tenant.update({
          where: { id: sub.tenantId },
          data: { status: 'SUSPENDED' },
        });

        await addEmailJob({
          to: sub.tenant.email,
          subject: 'Your TaxiFlow Trial Has Expired',
          template: 'trial-expired',
          variables: { companyName: sub.tenant.name },
        });

        logger.info('Trial expired — tenant suspended', { tenantId: sub.tenantId });
      }
    } catch (error) {
      logger.error('Trial expiry check failed', { error });
    }
  });

  // ─── MARK STALE BOOKINGS AS CANCELLED (every 15 min) ────
  cron.schedule('*/15 * * * *', async () => {
    try {
      const staleThreshold = new Date();
      staleThreshold.setMinutes(staleThreshold.getMinutes() - 30);

      const result = await prisma.booking.updateMany({
        where: {
          status: 'SEARCHING',
          createdAt: { lt: staleThreshold },
        },
        data: {
          status: 'NO_DRIVER_FOUND',
          cancelledAt: new Date(),
          cancellationReason: 'No driver found within time limit',
        },
      });

      if (result.count > 0) {
        logger.info(`Marked ${result.count} stale bookings as NO_DRIVER_FOUND`);
      }
    } catch (error) {
      logger.error('Stale booking cleanup failed', { error });
    }
  });

  logger.info('✅ Scheduled jobs started');
}
