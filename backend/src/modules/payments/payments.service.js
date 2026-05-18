"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentIntent = createPaymentIntent;
exports.confirmPayment = confirmPayment;
exports.refundPayment = refundPayment;
exports.getPaymentHistory = getPaymentHistory;
exports.processDriverPayout = processDriverPayout;
// modules/payments/payments.service.ts
// Stripe integration — uses CLIENT's own Stripe keys per agent.md
const uuid_1 = require("uuid");
const stripe_1 = __importDefault(require("stripe"));
const database_1 = require("../../config/database");
const logger_1 = require("../../config/logger");
const shared_constants_1 = require("@taxiflow/shared-constants");
const shared_utils_1 = require("@taxiflow/shared-utils");
const ApiError_1 = require("../../utils/ApiError");
const tenants_service_1 = require("../tenants/tenants.service");
const queues_1 = require("../../jobs/queues");
const logger = (0, logger_1.createModuleLogger)('payments-service');
// Get a Stripe instance using the TENANT'S OWN key
async function getTenantStripe(tenantId) {
    const secretKey = await (0, tenants_service_1.getDecryptedApiKey)(tenantId, 'STRIPE_SECRET');
    return new stripe_1.default(secretKey, { apiVersion: '2024-04-10' });
}
// ─── CREATE PAYMENT INTENT ────────────────────────────────
async function createPaymentIntent(bookingId, tenantId) {
    const booking = await database_1.prisma.booking.findFirst({
        where: { id: bookingId, tenantId, paymentMethod: 'CARD' },
        include: { passenger: { include: { user: { select: { email: true, firstName: true } } } } },
    });
    if (!booking)
        throw new ApiError_1.ApiError('Booking not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.BOOKING_NOT_FOUND);
    if (booking.paymentStatus === 'PAID')
        throw new ApiError_1.ApiError('Booking already paid', shared_constants_1.HTTP_STATUS.CONFLICT, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    const tenant = await database_1.prisma.tenant.findUnique({ where: { id: tenantId }, select: { currency: true, name: true } });
    const stripe = await getTenantStripe(tenantId);
    const amount = Math.round((booking.actualFare ?? booking.estimatedFare) * 100); // pence/cents
    const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: (tenant?.currency ?? 'GBP').toLowerCase(),
        metadata: { bookingId, tenantId },
        description: `${tenant?.name ?? 'TaxiFlow'} — Booking ${bookingId.slice(0, 8)}`,
    });
    // Update payment record
    await database_1.prisma.payment.upsert({
        where: { bookingId },
        create: {
            id: (0, uuid_1.v4)(),
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
async function confirmPayment(bookingId, tenantId, stripePaymentIntentId) {
    const stripe = await getTenantStripe(tenantId);
    const intent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
    if (intent.status !== 'succeeded') {
        throw new ApiError_1.ApiError('Payment not completed', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.PAYMENT_FAILED);
    }
    const payment = await database_1.prisma.payment.update({
        where: { bookingId },
        data: {
            status: 'PAID',
            stripeChargeId: typeof intent.latest_charge === 'string' ? intent.latest_charge : null,
            processedAt: new Date(),
        },
    });
    await database_1.prisma.booking.update({
        where: { id: bookingId },
        data: { paymentStatus: 'PAID' },
    });
    // Notify passenger
    const booking = await database_1.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { passenger: { include: { user: { select: { id: true, email: true, firstName: true } } } } },
    });
    if (booking) {
        await (0, queues_1.addNotificationJob)({
            tenantId,
            userId: booking.passenger.userId,
            type: 'PAYMENT_RECEIVED',
            title: 'Payment Confirmed',
            body: `Payment of ${payment.amount.toFixed(2)} ${payment.currency} received.`,
        });
        if (booking.passenger.user.email) {
            await (0, queues_1.addEmailJob)({
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
async function refundPayment(bookingId, tenantId, reason, amountToRefund) {
    const payment = await database_1.prisma.payment.findUnique({ where: { bookingId } });
    if (!payment || payment.tenantId !== tenantId) {
        throw new ApiError_1.ApiError('Payment not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.PAYMENT_NOT_FOUND);
    }
    if (payment.status !== 'PAID') {
        throw new ApiError_1.ApiError('Payment cannot be refunded', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    if (!payment.stripeChargeId && !payment.stripePaymentIntentId) {
        throw new ApiError_1.ApiError('No Stripe charge found for this payment', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
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
    const updatedPayment = await database_1.prisma.payment.update({
        where: { bookingId },
        data: {
            status: 'REFUNDED',
            refundId: refund.id,
            refundAmount: (refund.amount ?? 0) / 100,
            refundReason: reason,
        },
    });
    await database_1.prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: 'REFUNDED' } });
    logger.info('Payment refunded', { bookingId, refundId: refund.id });
    return updatedPayment;
}
// ─── PAYMENT HISTORY ──────────────────────────────────────
async function getPaymentHistory(tenantId, page, limit) {
    const pagination = (0, shared_utils_1.buildPagination)(page, limit);
    const [payments, total] = await Promise.all([
        database_1.prisma.payment.findMany({
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
        database_1.prisma.payment.count({ where: { tenantId } }),
    ]);
    return { payments, pagination: { ...pagination, total } };
}
// ─── DRIVER PAYOUTS ───────────────────────────────────────
async function processDriverPayout(driverId, tenantId, periodStart, periodEnd) {
    const driver = await database_1.prisma.driver.findFirst({
        where: { id: driverId, tenantId },
        select: { id: true, stripeAccountId: true, userId: true },
    });
    if (!driver)
        throw new ApiError_1.ApiError('Driver not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.DRIVER_NOT_FOUND);
    if (!driver.stripeAccountId) {
        throw new ApiError_1.ApiError('Driver has no payout account configured', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    // Calculate earnings for period
    const bookings = await database_1.prisma.booking.findMany({
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
        throw new ApiError_1.ApiError('Payout amount too small', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    const tenant = await database_1.prisma.tenant.findUnique({ where: { id: tenantId }, select: { currency: true } });
    const stripe = await getTenantStripe(tenantId);
    const transfer = await stripe.transfers.create({
        amount: Math.round(driverShare * 100),
        currency: (tenant?.currency ?? 'GBP').toLowerCase(),
        destination: driver.stripeAccountId,
        metadata: { driverId, tenantId, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() },
    });
    const payout = await database_1.prisma.payout.create({
        data: {
            id: (0, uuid_1.v4)(),
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
    await (0, queues_1.addNotificationJob)({
        tenantId,
        userId: driver.userId,
        type: 'PAYOUT_PROCESSED',
        title: 'Payout Processed 💰',
        body: `${driverShare.toFixed(2)} ${tenant?.currency} has been transferred to your account.`,
    });
    logger.info('Driver payout processed', { driverId, amount: driverShare, transferId: transfer.id });
    return payout;
}
//# sourceMappingURL=payments.service.js.map