// ============================================================
// jobs/queues.ts — Bull job queues (Redis-backed)
// Handles: notifications, emails, payout processing, cleanup
// ============================================================

import Bull from 'bull';
import { env } from '../config/env';
import { createModuleLogger } from '../config/logger';

const logger = createModuleLogger('job-queues');

const defaultJobOptions: Bull.JobOptions = {
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 200,
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
};

// ─── QUEUE DEFINITIONS ────────────────────────────────────

export const notificationQueue = new Bull('notifications', {
  redis: env.REDIS_URL,
  defaultJobOptions,
});

export const emailQueue = new Bull('emails', {
  redis: env.REDIS_URL,
  defaultJobOptions: { ...defaultJobOptions, attempts: 5 },
});

export const smsQueue = new Bull('sms', {
  redis: env.REDIS_URL,
  defaultJobOptions,
});

export const payoutQueue = new Bull('payouts', {
  redis: env.REDIS_URL,
  defaultJobOptions: { ...defaultJobOptions, attempts: 5 },
});

export const bookingTimeoutQueue = new Bull('booking-timeouts', {
  redis: env.REDIS_URL,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 50,
    attempts: 1,
  },
});

// ─── JOB DATA TYPES ───────────────────────────────────────

export interface NotificationJobData {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  fcmToken?: string;
}

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, string | number | boolean>;
  tenantId?: string;
}

export interface SmsJobData {
  tenantId: string;
  to: string;
  message: string;
}

export interface PayoutJobData {
  tenantId: string;
  driverId: string;
  periodStart: Date;
  periodEnd: Date;
}

export interface BookingTimeoutJobData {
  bookingId: string;
  tenantId: string;
  driverUserId: string;
}

// ─── QUEUE EVENT LOGGING ──────────────────────────────────

const queues = [notificationQueue, emailQueue, smsQueue, payoutQueue, bookingTimeoutQueue];

queues.forEach((queue) => {
  queue.on('completed', (job) => {
    logger.debug(`Job completed`, { queue: queue.name, jobId: job.id });
  });

  queue.on('failed', (job, error: Error) => {
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

export async function addNotificationJob(data: NotificationJobData): Promise<void> {
  await notificationQueue.add(data);
}

export async function addEmailJob(data: EmailJobData): Promise<void> {
  await emailQueue.add(data);
}

export async function addSmsJob(data: SmsJobData): Promise<void> {
  await smsQueue.add(data);
}

export async function addPayoutJob(data: PayoutJobData): Promise<void> {
  await payoutQueue.add(data);
}

export async function addBookingTimeoutJob(
  data: BookingTimeoutJobData,
  delayMs: number,
): Promise<Bull.Job<BookingTimeoutJobData>> {
  return bookingTimeoutQueue.add(data, { delay: delayMs });
}

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────

export async function closeQueues(): Promise<void> {
  await Promise.all(queues.map((q) => q.close()));
  logger.info('All job queues closed');
}
