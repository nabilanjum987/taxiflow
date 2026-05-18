// modules/payments/payments.service.ts
// Stripe integration — uses CLIENT's own Stripe keys per agent.md
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import { prisma } from '../../config/database';
import { createModuleLogger } from '../../config/logger';
import { ERROR_CODES, HTTP_STATUS } from '@taxiflow/shared-constants';
import { buildPagination } from '@taxiflow/shared-utils';
import { ApiError } from '../../utils/ApiError';
import { getDecryptedApiKey } from '../tenants/tenants.service';
import { addNotificationJob, addEmailJob } from '../../jobs/queues';

const logger = createModuleLogger('payments-service');

// Get a Stripe instance using the TENANT'S OWN key
async function getTenantStripe(tenantId: string): Promise<Stripe> {
  const secretKey = await getDecryptedApiKey(tenantId, 'STRIPE_SECRET');
  return new Stripe(secretKey, { apiVersion: '2024-04-10' });
}

// ─── CREATE PAYMENT INTENT ────────────────────────────────

export async function createPaymentIntent(bookingId: string, tenantId: string) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, tenantId, paymentMethod: 'CARD' },
    include: { passenger: { include: { user: { select: { email: true, firstName: true } } } } },
  });

  if (!booking) throw new ApiError('Booking not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.BOOKING_NOT_FOUND);
  if (booking.paymentStatus === 'PAID') throw new ApiError('Booking already paid', HTTP_STATUS.CONFLICT, ERROR_CODES.VALIDATION_ERROR);

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { currency: true, name: true } });
  const stripe = await getTenantStripe(tenantId);

  const amount = Math.round((booking.actualFare ?? booking.estimatedFare) * 100); // pence/cents

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: (tenant?.currency ?? 'GBP').toLowerCase(),
    metadata: { bookingId, tenantId },
    description: `${tenant?.name ?? 'TaxiFlow'} — Booking ${bookingId.slice(0, 8)}`,
  });

  // Update payment record
  await prisma.payment.upsert({
    where: { bookingId },
    create: {
      id: uuidv4(),
      tenantId,
      bookingId,
      amount: booking.actualFare ?? booking.estimatedFare,
      currency: tenant?.currency ?? 'GBP',
      method: 'CARD',
      status: 'PENDING',
      stripePaymentIntentId: paymentIntent.id,
    },
    update: { stripePaymentIntentId: paymentIntent.id },
  });

  logger.info('Payment intent created', { bookingId, amount });
  return { clientSecret: paymentIntent.client_secret, amount, currency: tenant?.currency ?? 'GBP' };
}

// ─── CONFIRM PAYMENT ──────────────────────────────────────

export async function confirmPayment(bookingId: string, tenantId: string, stripePaymentIntentId: string) {
  const stripe = await getTenantStripe(tenantId);

  const intent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);

  if (intent.status !== 'succeeded') {
    throw new ApiError('Payment not completed', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.PAYMENT_FAILED);
  }

  const payment = await prisma.payment.update({
    where: { bookingId },
    data: {
      status: 'PAID',
      stripeChargeId: typeof intent.latest_charge === 'string' ? intent.latest_charge : null,
      processedAt: new Date(),
    },
  });

  await prisma.booking.update({
    where: { id: bookingId },
    data: { paymentStatus: 'PAID' },
  });

  // Notify passenger
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { passenger: { include: { user: { select: { id: true, email: true, firstName: true } } } } },
  });

  if (booking) {
    await addNotificationJob({
      tenantId,
      userId: booking.passenger.userId,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Confirmed',
      body: `Payment of ${payment.amount.toFixed(2)} ${payment.currency} received.`,
    });

    if (booking.passenger.user.email) {
      await addEmailJob({
        to: booking.passenger.user.email,
        subject: 'Payment Confirmed — TaxiFlow',
        template: 'payment-confirmed',
        variables: {
          firstName: booking.passenger.user.firstName,
          amount: payment.amount.toFixed(2),
          currency: payment.currency,
          bookingId: bookingId.slice(0, 8).toUpperCase(),
        },
      });
    }
  }

  logger.info('Payment confirmed', { bookingId, amount: payment.amount });
  return payment;
}

// ─── REFUND ───────────────────────────────────────────────

export async function refundPayment(bookingId: string, tenantId: string, reason: string, amountToRefund?: number) {
  const payment = await prisma.payment.findUnique({ where: { bookingId } });

  if (!payment || payment.tenantId !== tenantId) {
    throw new ApiError('Payment not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.PAYMENT_NOT_FOUND);
  }

  if (payment.status !== 'PAID') {
    throw new ApiError('Payment cannot be refunded', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  if (!payment.stripeChargeId && !payment.stripePaymentIntentId) {
    throw new ApiError('No Stripe charge found for this payment', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  const stripe = await getTenantStripe(tenantId);
  const refundAmount = amountToRefund
    ? Math.round(amountToRefund * 100)
    : undefined; // undefined = full refund

  const refund = await stripe.refunds.create({
    payment_intent: payment.stripePaymentIntentId ?? undefined,
    charge: payment.stripeChargeId ?? undefined,
    amount: refundAmount,
    reason: 'requested_by_customer',
  });

  const updatedPayment = await prisma.payment.update({
    where: { bookingId },
    data: {
      status: 'REFUNDED',
      refundId: refund.id,
      refundAmount: (refund.amount ?? 0) / 100,
      refundReason: reason,
    },
  });

  await prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: 'REFUNDED' } });

  logger.info('Payment refunded', { bookingId, refundId: refund.id });
  return updatedPayment;
}

// ─── PAYMENT HISTORY ──────────────────────────────────────

export async function getPaymentHistory(tenantId: string, page: number, limit: number) {
  const pagination = buildPagination(page, limit);

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { tenantId },
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          select: {
            pickupAddress: true,
            dropoffAddress: true,
            passenger: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    }),
    prisma.payment.count({ where: { tenantId } }),
  ]);

  return { payments, pagination: { ...pagination, total } };
}

// ─── DRIVER PAYOUTS ───────────────────────────────────────

export async function processDriverPayout(
  driverId: string,
  tenantId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, tenantId },
    select: { id: true, stripeAccountId: true, userId: true },
  });

  if (!driver) throw new ApiError('Driver not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.DRIVER_NOT_FOUND);
  if (!driver.stripeAccountId) {
    throw new ApiError('Driver has no payout account configured', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  // Calculate earnings for period
  const bookings = await prisma.booking.findMany({
    where: {
      tenantId,
      driverId,
      status: 'COMPLETED',
      completedAt: { gte: periodStart, lte: periodEnd },
      paymentStatus: 'PAID',
    },
    select: { id: true, actualFare: true },
  });

  const grossEarnings = bookings.reduce((sum, b) => sum + (b.actualFare ?? 0), 0);
  const driverShare = grossEarnings * 0.8; // 80% to driver, 20% platform fee

  if (driverShare < 1) {
    throw new ApiError('Payout amount too small', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { currency: true } });
  const stripe = await getTenantStripe(tenantId);

  const transfer = await stripe.transfers.create({
    amount: Math.round(driverShare * 100),
    currency: (tenant?.currency ?? 'GBP').toLowerCase(),
    destination: driver.stripeAccountId,
    metadata: { driverId, tenantId, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() },
  });

  const payout = await prisma.payout.create({
    data: {
      id: uuidv4(),
      tenantId,
      driverId,
      amount: driverShare,
      currency: tenant?.currency ?? 'GBP',
      status: 'PAID',
      periodStart,
      periodEnd,
      tripsCount: bookings.length,
      stripeTransferId: transfer.id,
      processedAt: new Date(),
    },
  });

  await addNotificationJob({
    tenantId,
    userId: driver.userId,
    type: 'PAYOUT_PROCESSED',
    title: 'Payout Processed 💰',
    body: `${driverShare.toFixed(2)} ${tenant?.currency} has been transferred to your account.`,
  });

  logger.info('Driver payout processed', { driverId, amount: driverShare, transferId: transfer.id });
  return payout;
}
