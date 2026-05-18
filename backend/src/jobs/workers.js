"use strict";
// ============================================================
// jobs/workers.ts — Bull job processors
// Processes background jobs: notifications, emails, SMS
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorkers = startWorkers;
const twilio_1 = __importDefault(require("twilio"));
const queues_1 = require("./queues");
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const tenants_service_1 = require("../modules/tenants/tenants.service");
const ApiError_1 = require("../utils/ApiError");
const uuid_1 = require("uuid");
const logger = (0, logger_1.createModuleLogger)('workers');
// ─── NOTIFICATION WORKER ──────────────────────────────────
queues_1.notificationQueue.process(async (job) => {
    const { tenantId, userId, type, title, body, data, fcmToken } = job.data;
    // Save notification to database
    await database_1.prisma.notification.create({
        data: {
            id: (0, uuid_1.v4)(),
            tenantId,
            userId,
            type: type,
            title,
            body,
            data: data ?? null,
            isRead: false,
        },
    });
    // Send FCM push notification if token provided
    if (fcmToken) {
        // TODO Phase 2: Send via Firebase Admin SDK
        // const message = { token: fcmToken, notification: { title, body }, data }
        // await firebaseAdmin.messaging().send(message)
        logger.debug('FCM push queued', { userId, type });
    }
    logger.info('Notification processed', { userId, type });
});
// ─── EMAIL WORKER ─────────────────────────────────────────
queues_1.emailQueue.process(async (job) => {
    const { to, subject, template, variables } = job.data;
    // TODO Phase 2: Use SendGrid with template system
    // For now just log
    logger.info('Email job processed', { to: to.replace(/(.{2}).*(@)/, '$1***$2'), subject, template });
});
// ─── SMS WORKER ───────────────────────────────────────────
queues_1.smsQueue.process(async (job) => {
    const { tenantId, to, message } = job.data;
    let accountSid;
    let authToken;
    try {
        accountSid = await (0, tenants_service_1.getDecryptedApiKey)(tenantId, 'TWILIO_ACCOUNT_SID');
        authToken = await (0, tenants_service_1.getDecryptedApiKey)(tenantId, 'TWILIO_AUTH_TOKEN');
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            logger.warn('SMS skipped — Twilio credentials not configured for tenant', { tenantId });
            return;
        }
        throw error;
    }
    const tenant = await database_1.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { phone: true },
    });
    if (!tenant?.phone) {
        logger.warn('SMS skipped — tenant has no sender phone number configured', { tenantId });
        return;
    }
    try {
        const client = (0, twilio_1.default)(accountSid, authToken);
        await client.messages.create({
            body: message,
            from: tenant.phone,
            to,
        });
        logger.info('SMS sent', {
            tenantId,
            to: to.slice(0, 5) + '***',
            messageLength: message.length,
        });
    }
    catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        logger.error('SMS send failed', { tenantId, to: to.slice(0, 5) + '***', error: errMessage });
        throw error;
    }
});
// ─── BOOKING TIMEOUT WORKER ───────────────────────────────
queues_1.bookingTimeoutQueue.process(async (job) => {
    const { bookingId, tenantId, driverUserId } = job.data;
    const booking = await database_1.prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, status: true },
    });
    // Only act if still in SEARCHING state
    if (booking?.status !== 'SEARCHING')
        return;
    logger.info('Driver accept timeout — booking not accepted', { bookingId, driverUserId });
    // TODO Phase 2: Try next nearest driver or mark as NO_DRIVER_FOUND
    await database_1.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'NO_DRIVER_FOUND' },
    });
});
function startWorkers() {
    logger.info('✅ Job workers started');
}
//# sourceMappingURL=workers.js.map