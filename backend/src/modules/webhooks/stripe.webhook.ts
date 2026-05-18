// ============================================================
// modules/webhooks/stripe.webhook.ts
// Stripe webhooks — our subscription billing events
// CRITICAL: Verify webhook signature on every event
// ============================================================

import { Request, Response } from 'express';
import Stripe from 'stripe';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { createModuleLogger } from '../../config/logger';
import { addEmailJob } from '../../jobs/queues';
import { runOnboarding } from '../onboarding/onboarding.service';

const logger = createModuleLogger('stripe-webhook');

const stripe = new Stripe(env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-04-10' });

// Metadata set on Stripe checkout session when client signs up
interface OnboardingMetadata {
  companyName: string;
  adminEmail: string;
  adminPhone: string;
  adminFirstName: string;
  adminLastName: string;
  country: string;
  currency: string;
  timezone: string;
  planSlug: string;
}

export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'];

  if (!sig || !env.STRIPE_WEBHOOK_SECRET) {
    res.status(400).json({ error: 'Missing stripe signature' });
    return;
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature — NEVER skip this
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', { err });
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  logger.info('Stripe webhook received', { type: event.type, id: event.id });

  try {
    switch (event.type) {

      // ─── NEW SUBSCRIPTION CHECKOUT COMPLETED ──────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== 'subscription') break;
        if (session.payment_status !== 'paid') break;

        const metadata = session.metadata as unknown as OnboardingMetadata;

        if (!metadata?.adminEmail) {
          logger.error('Onboarding metadata missing from checkout session', { sessionId: session.id });
          break;
        }

        // Run automated onboarding
        const result = await runOnboarding({
          companyName: metadata.companyName,
          adminEmail: metadata.adminEmail,
          adminPhone: metadata.adminPhone,
          adminFirstName: metadata.adminFirstName,
          adminLastName: metadata.adminLastName,
          country: metadata.country ?? 'GB',
          currency: metadata.currency ?? 'GBP',
          timezone: metadata.timezone ?? 'Europe/London',
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          planSlug: metadata.planSlug,
        });

        logger.info('Onboarding completed from webhook', {
          tenantId: result.tenantId,
          adminEmail: result.adminEmail,
        });
        break;
      }

      // ─── SUBSCRIPTION RENEWED ─────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.billing_reason !== 'subscription_cycle') break;

        const sub = await prisma.tenantSubscription.findUnique({
          where: { stripeSubscriptionId: invoice.subscription as string },
          include: { tenant: true, plan: true },
        });

        if (!sub) break;

        // Update subscription period
        const periodStart = new Date((invoice.period_start) * 1000);
        const periodEnd = new Date((invoice.period_end) * 1000);

        await prisma.tenantSubscription.update({
          where: { id: sub.id },
          data: { status: 'ACTIVE', currentPeriodStart: periodStart, currentPeriodEnd: periodEnd },
        });

        // Ensure tenant is active
        await prisma.tenant.update({
          where: { id: sub.tenantId },
          data: { status: 'ACTIVE' },
        });

        // Record invoice
        await prisma.invoice.create({
          data: {
            id: crypto.randomUUID(),
            tenantId: sub.tenantId,
            amount: (invoice.amount_paid ?? 0) / 100,
            currency: invoice.currency.toUpperCase(),
            status: 'PAID',
            periodStart,
            periodEnd,
            paidAt: new Date(),
            dueDate: periodEnd,
            stripeInvoiceId: invoice.id,
          },
        });

        // Send renewal receipt
        const admin = await prisma.user.findFirst({
          where: { tenantId: sub.tenantId, role: 'TENANT_ADMIN' },
          select: { email: true, firstName: true },
        });

        if (admin?.email) {
          await addEmailJob({
            to: admin.email,
            subject: `TaxiFlow — Payment received for ${sub.tenant.name}`,
            template: 'subscription-renewed',
            variables: {
              firstName: admin.firstName,
              companyName: sub.tenant.name,
              amount: `${invoice.currency.toUpperCase()} ${((invoice.amount_paid ?? 0) / 100).toFixed(2)}`,
              planName: sub.plan.name,
              nextBillingDate: periodEnd.toLocaleDateString(),
            },
          });
        }

        logger.info('Subscription renewed', { tenantId: sub.tenantId });
        break;
      }

      // ─── PAYMENT FAILED ───────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;

        const sub = await prisma.tenantSubscription.findUnique({
          where: { stripeSubscriptionId: invoice.subscription as string },
          include: { tenant: true },
        });

        if (!sub) break;

        await prisma.tenantSubscription.update({
          where: { id: sub.id },
          data: { status: 'PAST_DUE' },
        });

        const admin = await prisma.user.findFirst({
          where: { tenantId: sub.tenantId, role: 'TENANT_ADMIN' },
          select: { email: true, firstName: true },
        });

        if (admin?.email) {
          await addEmailJob({
            to: admin.email,
            subject: '⚠️ TaxiFlow — Payment failed, action required',
            template: 'payment-failed',
            variables: {
              firstName: admin.firstName,
              companyName: sub.tenant.name,
              updatePaymentUrl: `${process.env.ADMIN_PANEL_URL}/billing`,
              supportEmail: 'support@taxiflow.com',
            },
          });
        }

        logger.warn('Subscription payment failed', { tenantId: sub.tenantId });
        break;
      }

      // ─── SUBSCRIPTION CANCELLED ───────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        const sub = await prisma.tenantSubscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (!sub) break;

        await prisma.tenantSubscription.update({
          where: { id: sub.id },
          data: { status: 'CANCELLED', cancelAtPeriodEnd: true },
        });

        // Grace period — suspend after 3 days
        // Handled by scheduled job in scheduledJobs.ts
        logger.info('Subscription cancelled', { tenantId: sub.tenantId });
        break;
      }

      // ─── PLAN UPGRADED / DOWNGRADED ───────────────────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        const sub = await prisma.tenantSubscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (!sub) break;

        // Find matching plan by Stripe price ID
        const priceId = subscription.items.data[0]?.price?.id;
        if (!priceId) break;

        // Update subscription status
        const newStatus = subscription.status === 'active' ? 'ACTIVE'
          : subscription.status === 'past_due' ? 'PAST_DUE'
          : subscription.status === 'canceled' ? 'CANCELLED'
          : 'ACTIVE';

        await prisma.tenantSubscription.update({
          where: { id: sub.id },
          data: {
            status: newStatus as 'ACTIVE',
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        });

        logger.info('Subscription updated', { tenantId: sub.tenantId, newStatus });
        break;
      }

      default:
        logger.debug('Unhandled webhook event', { type: event.type });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook processing error', { error, eventType: event.type });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
