// modules/subscriptions/subscriptions.service.ts
import Stripe from 'stripe';
import { prisma } from '../../config/database';
import { createModuleLogger } from '../../config/logger';
import { env } from '../../config/env';
import { ERROR_CODES, HTTP_STATUS } from '@taxiflow/shared-constants';
import { ApiError } from '../../utils/ApiError';

const logger = createModuleLogger('subscriptions-service');
const stripe = new Stripe(env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-04-10' });

// ─── GET SUBSCRIPTION STATUS ──────────────────────────────

export async function getSubscriptionStatus(tenantId: string) {
  const sub = await prisma.tenantSubscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });

  if (!sub) {
    throw new ApiError('No subscription found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.SUBSCRIPTION_INACTIVE);
  }

  const invoices = await prisma.invoice.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });

  return {
    subscription: sub,
    invoices,
    isActive: sub.status === 'ACTIVE' || sub.status === 'TRIALING',
    daysUntilRenewal: Math.ceil(
      (sub.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    ),
  };
}

// ─── ALL AVAILABLE PLANS ──────────────────────────────────

export async function getAvailablePlans() {
  return prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { priceMonthly: 'asc' },
  });
}

// ─── UPGRADE / DOWNGRADE PLAN ─────────────────────────────

export async function changePlan(tenantId: string, newPlanSlug: string): Promise<void> {
  const [currentSub, newPlan] = await Promise.all([
    prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    }),
    prisma.subscriptionPlan.findUnique({ where: { slug: newPlanSlug } }),
  ]);

  if (!currentSub?.stripeSubscriptionId) {
    throw new ApiError('No active subscription found', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.SUBSCRIPTION_INACTIVE);
  }

  if (!newPlan) {
    throw new ApiError('Plan not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  if (currentSub.plan.slug === newPlanSlug) {
    throw new ApiError('You are already on this plan', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  // Get current subscription from Stripe
  const stripeSub = await stripe.subscriptions.retrieve(currentSub.stripeSubscriptionId);
  const currentItemId = stripeSub.items.data[0]?.id;

  if (!currentItemId) {
    throw new ApiError('Stripe subscription item not found', HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL_ERROR);
  }

  // For plan changes, we need the Stripe price ID for the new plan
  // In production, these would be stored in the subscription_plans table
  const PLAN_PRICE_MAP: Record<string, string> = {
    starter: process.env.STRIPE_PRICE_STARTER ?? '',
    business: process.env.STRIPE_PRICE_BUSINESS ?? '',
    pro: process.env.STRIPE_PRICE_PRO ?? '',
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE ?? '',
  };

  const newPriceId = PLAN_PRICE_MAP[newPlanSlug];
  if (!newPriceId) {
    throw new ApiError('Stripe price not configured for this plan', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  // Update in Stripe — proration handled automatically
  await stripe.subscriptions.update(currentSub.stripeSubscriptionId, {
    items: [{ id: currentItemId, price: newPriceId }],
    proration_behavior: 'create_prorations',
  });

  // Update in database
  await prisma.tenantSubscription.update({
    where: { tenantId },
    data: { planId: newPlan.id },
  });

  logger.info('Plan changed', { tenantId, from: currentSub.plan.slug, to: newPlanSlug });
}

// ─── CANCEL SUBSCRIPTION ──────────────────────────────────

export async function cancelSubscription(tenantId: string, cancelImmediately = false): Promise<void> {
  const sub = await prisma.tenantSubscription.findUnique({
    where: { tenantId },
    include: { tenant: true },
  });

  if (!sub?.stripeSubscriptionId) {
    throw new ApiError('No active subscription', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.SUBSCRIPTION_INACTIVE);
  }

  if (cancelImmediately) {
    await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    await prisma.tenantSubscription.update({
      where: { tenantId },
      data: { status: 'CANCELLED', cancelAtPeriodEnd: true },
    });
    await prisma.tenant.update({ where: { id: tenantId }, data: { status: 'SUSPENDED' } });
  } else {
    // Cancel at period end — client keeps access until paid period expires
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    await prisma.tenantSubscription.update({
      where: { tenantId },
      data: { cancelAtPeriodEnd: true },
    });
  }

  logger.info('Subscription cancelled', { tenantId, cancelImmediately });
}

// ─── CREATE STRIPE CHECKOUT SESSION (for new signups) ─────

export async function createCheckoutSession(input: {
  planSlug: string;
  companyName: string;
  adminEmail: string;
  adminPhone: string;
  adminFirstName: string;
  adminLastName: string;
  country: string;
  currency: string;
  timezone: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionUrl: string }> {

  const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: input.planSlug } });
  if (!plan) throw new ApiError('Plan not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);

  const PLAN_PRICE_MAP: Record<string, string> = {
    starter: process.env.STRIPE_PRICE_STARTER ?? '',
    business: process.env.STRIPE_PRICE_BUSINESS ?? '',
    pro: process.env.STRIPE_PRICE_PRO ?? '',
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE ?? '',
  };

  const priceId = PLAN_PRICE_MAP[input.planSlug];
  if (!priceId) {
    throw new ApiError(
      'Stripe price not configured. Please contact support.',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
    );
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

export async function createCustomerPortalSession(tenantId: string, returnUrl: string): Promise<string> {
  const sub = await prisma.tenantSubscription.findUnique({
    where: { tenantId },
    select: { stripeCustomerId: true },
  });

  if (!sub?.stripeCustomerId) {
    throw new ApiError('No billing account found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}
