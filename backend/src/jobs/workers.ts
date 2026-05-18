// ============================================================
// jobs/workers.ts — Bull job processors
// Processes background jobs: notifications, emails, SMS
// ============================================================

import Bull from 'bull';
import twilio from 'twilio';
import { notificationQueue, emailQueue, smsQueue, bookingTimeoutQueue } from './queues';
import type { NotificationJobData, EmailJobData, SmsJobData, BookingTimeoutJobData } from './queues';
import { prisma } from '../config/database';
import { createModuleLogger } from '../config/logger';
import { getDecryptedApiKey } from '../modules/tenants/tenants.service';
import { ApiError } from '../utils/ApiError';
import { v4 as uuidv4 } from 'uuid';

const logger = createModuleLogger('workers');

// ─── NOTIFICATION WORKER ──────────────────────────────────

notificationQueue.process(async (job: Bull.Job<NotificationJobData>) => {
  const { tenantId, userId, type, title, body, data, fcmToken } = job.data;

  // Save notification to database
  await prisma.notification.create({
    data: {
      id: uuidv4(),
      tenantId,
      userId,
      type: type as never,
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

emailQueue.process(async (job: Bull.Job<EmailJobData>) => {
  const { to, subject, template, variables } = job.data;

  // TODO Phase 2: Use SendGrid with template system
  // For now just log
  logger.info('Email job processed', { to: to.replace(/(.{2}).*(@)/, '$1***$2'), subject, template });
});

// ─── SMS WORKER ───────────────────────────────────────────

smsQueue.process(async (job: Bull.Job<SmsJobData>) => {
  const { tenantId, to, message } = job.data;

  let accountSid: string;
  let authToken: string;
  try {
    accountSid = await getDecryptedApiKey(tenantId, 'TWILIO_ACCOUNT_SID');
    authToken = await getDecryptedApiKey(tenantId, 'TWILIO_AUTH_TOKEN');
  } catch (error) {
    if (error instanceof ApiError) {
      logger.warn('SMS skipped — Twilio credentials not configured for tenant', { tenantId });
      return;
    }
    throw error;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { phone: true },
  });

  if (!tenant?.phone) {
    logger.warn('SMS skipped — tenant has no sender phone number configured', { tenantId });
    return;
  }

  try {
    const client = twilio(accountSid, authToken);
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
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error('SMS send failed', { tenantId, to: to.slice(0, 5) + '***', error: errMessage });
    throw error;
  }
});

// ─── BOOKING TIMEOUT WORKER ───────────────────────────────

bookingTimeoutQueue.process(async (job: Bull.Job<BookingTimeoutJobData>) => {
  const { bookingId, tenantId, driverUserId } = job.data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true },
  });

  // Only act if still in SEARCHING state
  if (booking?.status !== 'SEARCHING') return;

  logger.info('Driver accept timeout — booking not accepted', { bookingId, driverUserId });

  // TODO Phase 2: Try next nearest driver or mark as NO_DRIVER_FOUND
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'NO_DRIVER_FOUND' },
  });
});

export function startWorkers(): void {
  logger.info('✅ Job workers started');
}
