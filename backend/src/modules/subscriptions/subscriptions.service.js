"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptionStatus = getSubscriptionStatus;
exports.getAvailablePlans = getAvailablePlans;
exports.changePlan = changePlan;
exports.cancelSubscription = cancelSubscription;
exports.createCheckoutSession = createCheckoutSession;
exports.createCustomerPortalSession = createCustomerPortalSession;
// modules/subscriptions/subscriptions.service.ts
const stripe_1 = __importDefault(require("stripe"));
const database_1 = require("../../config/database");
const logger_1 = require("../../config/logger");
const env_1 = require("../../config/env");
const shared_constants_1 = require("@taxiflow/shared-constants");
const ApiError_1 = require("../../utils/ApiError");
const logger = (0, logger_1.createModuleLogger)('subscriptions-service');
const stripe = new stripe_1.default(env_1.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-04-10' });
// ─── GET SUBSCRIPTION STATUS ──────────────────────────────
async function getSubscriptionStatus(tenantId) {
    const sub = await database_1.prisma.tenantSubscription.findUnique({
        where: { tenantId },
        include: { plan: true },
    });
    if (!sub) {
        throw new ApiError_1.ApiError('No subscription found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.SUBSCRIPTION_INACTIVE);
    }
    const invoices = await database_1.prisma.invoice.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 6,
    });
    return {
        subscription: sub,
        invoices,
        isActive: sub.status === 'ACTIVE' || sub.status === 'TRIALING',
        daysUntilRenewal: Math.ceil((sub.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    };
}
// ─── ALL AVAILABLE PLANS ──────────────────────────────────
async function getAvailablePlans() {
    return database_1.prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { priceMonthly: 'asc' },
    });
}
// ─── UPGRADE / DOWNGRADE PLAN ─────────────────────────────
async function changePlan(tenantId, newPlanSlug) {
    const [currentSub, newPlan] = await Promise.all([
        database_1.prisma.tenantSubscription.findUnique({
            where: { tenantId },
            include: { plan: true },
        }),
        database_1.prisma.subscriptionPlan.findUnique({ where: { slug: newPlanSlug } }),
    ]);
    if (!currentSub?.stripeSubscriptionId) {
        throw new ApiError_1.ApiError('No active subscription found', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.SUBSCRIPTION_INACTIVE);
    }
    if (!newPlan) {
        throw new ApiError_1.ApiError('Plan not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.NOT_FOUND);
    }
    if (currentSub.plan.slug === newPlanSlug) {
        throw new ApiError_1.ApiError('You are already on this plan', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    // Get current subscription from Stripe
    const stripeSub = await stripe.subscriptions.retrieve(currentSub.stripeSubscriptionId);
    const currentItemId = stripeSub.items.data[0]?.id;
    if (!currentItemId) {
        throw new ApiError_1.ApiError('Stripe subscription item not found', shared_constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, shared_constants_1.ERROR_CODES.INTERNAL_ERROR);
    }
    // For plan changes, we need the Stripe price ID for the new plan
    // In production, these would be stored in the subscription_plans table
    const PLAN_PRICE_MAP = {
        starter: process.env.STRIPE_PRICE_STARTER ?? '',
        business: process.env.STRIPE_PRICE_BUSINESS ?? '',
        pro: process.env.STRIPE_PRICE_PRO ?? '',
        enterprise: process.env.STRIPE_PRICE_ENTERPRISE ?? '',
    };
    const newPriceId = PLAN_PRICE_MAP[newPlanSlug];
    if (!newPriceId) {
        throw new ApiError_1.ApiError('Stripe price not configured for this plan', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    // Update in Stripe — proration handled automatically
    await stripe.subscriptions.update(currentSub.stripeSubscriptionId, {
        items: [{ id: currentItemId, price: newPriceId }],
        proration_behavior: 'create_prorations',
    });
    // Update in database
    await database_1.prisma.tenantSubscription.update({
        where: { tenantId },
        data: { planId: newPlan.id },
    });
    logger.info('Plan changed', { tenantId, from: currentSub.plan.slug, to: newPlanSlug });
}
// ─── CANCEL SUBSCRIPTION ──────────────────────────────────
async function cancelSubscription(tenantId, cancelImmediately = false) {
    const sub = await database_1.prisma.tenantSubscription.findUnique({
        where: { tenantId },
        include: { tenant: true },
    });
    if (!sub?.stripeSubscriptionId) {
        throw new ApiError_1.ApiError('No active subscription', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.SUBSCRIPTION_INACTIVE);
    }
    if (cancelImmediately) {
        await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
        await database_1.prisma.tenantSubscription.update({
            where: { tenantId },
            data: { status: 'CANCELLED', cancelAtPeriodEnd: true },
        });
        await database_1.prisma.tenant.update({ where: { id: tenantId }, data: { status: 'SUSPENDED' } });
    }
    else {
        // Cancel at period end — client keeps access until paid period expires
        await stripe.subscriptions.update(sub.stripeSubscriptionId, {
            cancel_at_period_end: true,
        });
        await database_1.prisma.tenantSubscription.update({
            where: { tenantId },
            data: { cancelAtPeriodEnd: true },
        });
    }
    logger.info('Subscription cancelled', { tenantId, cancelImmediately });
}
// ─── CREATE STRIPE CHECKOUT SESSION (for new signups) ─────
async function createCheckoutSession(input) {
    const plan = await database_1.prisma.subscriptionPlan.findUnique({ where: { slug: input.planSlug } });
    if (!plan)
        throw new ApiError_1.ApiError('Plan not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.NOT_FOUND);
    const PLAN_PRICE_MAP = {
        starter: process.env.STRIPE_PRICE_STARTER ?? '',
        business: process.env.STRIPE_PRICE_BUSINESS ?? '',
        pro: process.env.STRIPE_PRICE_PRO ?? '',
        enterprise: process.env.STRIPE_PRICE_ENTERPRISE ?? '',
    };
    const priceId = PLAN_PRICE_MAP[input.planSlug];
    if (!priceId) {
        throw new ApiError_1.ApiError('Stripe price not configured. Please contact support.', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: input.adminEmail,
        line_items: [{ price: priceId, quantity: 1 }],
        // Metadata passed to webhook for automated onboarding
        metadata: {
            companyName: input.companyName,
            adminEmail: input.adminEmail,
            adminPhone: input.adminPhone,
            adminFirstName: input.adminFirstName,
            adminLastName: input.adminLastName,
            country: input.country,
            currency: input.currency,
            timezone: input.timezone,
            planSlug: input.planSlug,
        },
        success_url: `${input.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: input.cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        subscription_data: {
            trial_period_days: 0, // Already on paid plan
            metadata: { companyName: input.companyName, planSlug: input.planSlug },
        },
    });
    return { sessionUrl: session.url ?? '' };
}
// ─── CREATE CUSTOMER PORTAL SESSION (for self-service billing) ─
async function createCustomerPortalSession(tenantId, returnUrl) {
    const sub = await database_1.prisma.tenantSubscription.findUnique({
        where: { tenantId },
        select: { stripeCustomerId: true },
    });
    if (!sub?.stripeCustomerId) {
        throw new ApiError_1.ApiError('No billing account found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.NOT_FOUND);
    }
    const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: returnUrl,
    });
    return session.url;
}
//# sourceMappingURL=subscriptions.service.js.map