"use strict";
// ============================================================
// jobs/queues.ts — Bull job queues (Redis-backed)
// Handles: notifications, emails, payout processing, cleanup
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingTimeoutQueue = exports.payoutQueue = exports.smsQueue = exports.emailQueue = exports.notificationQueue = void 0;
exports.addNotificationJob = addNotificationJob;
exports.addEmailJob = addEmailJob;
exports.addSmsJob = addSmsJob;
exports.addPayoutJob = addPayoutJob;
exports.addBookingTimeoutJob = addBookingTimeoutJob;
exports.closeQueues = closeQueues;
const bull_1 = __importDefault(require("bull"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const logger = (0, logger_1.createModuleLogger)('job-queues');
const defaultJobOptions = {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200,
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 2000,
    },
};
// ─── QUEUE DEFINITIONS ────────────────────────────────────
exports.notificationQueue = new bull_1.default('notifications', {
    redis: env_1.env.REDIS_URL,
    defaultJobOptions,
});
exports.emailQueue = new bull_1.default('emails', {
    redis: env_1.env.REDIS_URL,
    defaultJobOptions: { ...defaultJobOptions, attempts: 5 },
});
exports.smsQueue = new bull_1.default('sms', {
    redis: env_1.env.REDIS_URL,
    defaultJobOptions,
});
exports.payoutQueue = new bull_1.default('payouts', {
    redis: env_1.env.REDIS_URL,
    defaultJobOptions: { ...defaultJobOptions, attempts: 5 },
});
exports.bookingTimeoutQueue = new bull_1.default('booking-timeouts', {
    redis: env_1.env.REDIS_URL,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 50,
        attempts: 1,
    },
});
// ─── QUEUE EVENT LOGGING ──────────────────────────────────
const queues = [exports.notificationQueue, exports.emailQueue, exports.smsQueue, exports.payoutQueue, exports.bookingTimeoutQueue];
queues.forEach((queue) => {
    queue.on('completed', (job) => {
        logger.debug(`Job completed`, { queue: queue.name, jobId: job.id });
    });
    queue.on('failed', (job, error) => {
        logger.error(`Job failed`, {
            queue: queue.name,
            jobId: job.id,
            error: error.message,
            attempts: job.attemptsMade,
        });
    });
    queue.on('stalled', (job) => {
        logger.warn(`Job stalled`, { queue: queue.name, jobId: job.id });
    });
});
// ─── HELPER TO ADD JOBS ───────────────────────────────────
async function addNotificationJob(data) {
    await exports.notificationQueue.add(data);
}
async function addEmailJob(data) {
    await exports.emailQueue.add(data);
}
async function addSmsJob(data) {
    await exports.smsQueue.add(data);
}
async function addPayoutJob(data) {
    await exports.payoutQueue.add(data);
}
async function addBookingTimeoutJob(data, delayMs) {
    return exports.bookingTimeoutQueue.add(data, { delay: delayMs });
}
// ─── GRACEFUL SHUTDOWN ────────────────────────────────────
async function closeQueues() {
    await Promise.all(queues.map((q) => q.close()));
    logger.info('All job queues closed');
}
//# sourceMappingURL=queues.js.map