"use strict";
// ============================================================
// jobs/scheduledJobs.ts — node-cron scheduled tasks
// Runs: document expiry alerts, DB cleanup, subscription checks
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduledJobs = startScheduledJobs;
const node_cron_1 = __importDefault(require("node-cron"));
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const queues_1 = require("./queues");
const logger = (0, logger_1.createModuleLogger)('scheduled-jobs');
function startScheduledJobs() {
    // ─── CHECK EXPIRING DOCUMENTS (daily at 9am) ────────────
    node_cron_1.default.schedule('0 9 * * *', async () => {
        logger.info('Running: document expiry check');
        try {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            const expiringDocs = await database_1.prisma.driverDocument.findMany({
                where: {
                    expiryDate: { lte: thirtyDaysFromNow, gte: new Date() },
                    status: 'APPROVED',
                },
                include: { driver: { include: { user: true } } },
            });
            for (const doc of expiringDocs) {
                await (0, queues_1.addNotificationJob)({
                    tenantId: doc.tenantId,
                    userId: doc.driver.userId,
                    type: 'DOCUMENT_EXPIRY',
                    title: 'Document Expiring Soon',
                    body: `Your ${doc.type.replace('_', ' ')} expires on ${doc.expiryDate?.toLocaleDateString()}.`,
                });
            }
            logger.info(`Document expiry check complete`, { count: expiringDocs.length });
        }
        catch (error) {
            logger.error('Document expiry check failed', { error });
        }
    });
    // ─── CLEAN UP EXPIRED OTP CODES (every hour) ────────────
    node_cron_1.default.schedule('0 * * * *', async () => {
        try {
            const result = await database_1.prisma.otpCode.deleteMany({
                where: { expiresAt: { lt: new Date() } },
            });
            if (result.count > 0) {
                logger.debug(`Cleaned ${result.count} expired OTP codes`);
            }
        }
        catch (error) {
            logger.error('OTP cleanup failed', { error });
        }
    });
    // ─── CLEAN UP EXPIRED REFRESH TOKENS (daily at midnight) ─
    node_cron_1.default.schedule('0 0 * * *', async () => {
        try {
            const result = await database_1.prisma.refreshToken.deleteMany({
                where: { expiresAt: { lt: new Date() } },
            });
            logger.debug(`Cleaned ${result.count} expired refresh tokens`);
        }
        catch (error) {
            logger.error('Refresh token cleanup failed', { error });
        }
    });
    // ─── CHECK TRIAL EXPIRATIONS (daily at 8am) ──────────────
    node_cron_1.default.schedule('0 8 * * *', async () => {
        try {
            const expiredTrials = await database_1.prisma.tenantSubscription.findMany({
                where: {
                    status: 'TRIALING',
                    currentPeriodEnd: { lt: new Date() },
                },
                include: { tenant: true },
            });
            for (const sub of expiredTrials) {
                await database_1.prisma.tenantSubscription.update({
                    where: { id: sub.id },
                    data: { status: 'CANCELLED' },
                });
                await database_1.prisma.tenant.update({
                    where: { id: sub.tenantId },
                    data: { status: 'SUSPENDED' },
                });
                await (0, queues_1.addEmailJob)({
                    to: sub.tenant.email,
                    subject: 'Your TaxiFlow Trial Has Expired',
                    template: 'trial-expired',
                    variables: { companyName: sub.tenant.name },
                });
                logger.info('Trial expired — tenant suspended', { tenantId: sub.tenantId });
            }
        }
        catch (error) {
            logger.error('Trial expiry check failed', { error });
        }
    });
    // ─── MARK STALE BOOKINGS AS CANCELLED (every 15 min) ────
    node_cron_1.default.schedule('*/15 * * * *', async () => {
        try {
            const staleThreshold = new Date();
            staleThreshold.setMinutes(staleThreshold.getMinutes() - 30);
            const result = await database_1.prisma.booking.updateMany({
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
        }
        catch (error) {
            logger.error('Stale booking cleanup failed', { error });
        }
    });
    logger.info('✅ Scheduled jobs started');
}
//# sourceMappingURL=scheduledJobs.js.map