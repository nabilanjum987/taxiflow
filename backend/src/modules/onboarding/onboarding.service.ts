// ============================================================
// modules/onboarding/onboarding.service.ts
// agent.md Step 6-11: Payment confirmed → tenant created →
// credentials emailed → client enters API keys → LIVE
// Zero manual work from us
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { createModuleLogger } from '../../config/logger';
import { addEmailJob } from '../../jobs/queues';
import { BCRYPT_ROUNDS } from '@taxiflow/shared-constants';
import { slugify, generateRandomString } from '@taxiflow/shared-utils';

const logger = createModuleLogger('onboarding-service');

export interface OnboardingInput {
  // From the signup form on our landing page
  companyName: string;
  adminEmail: string;
  adminPhone: string;
  adminFirstName: string;
  adminLastName: string;
  country: string;
  currency: string;
  timezone: string;
  // From Stripe payment confirmation
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  planSlug: string;
}

export interface OnboardingResult {
  tenantId: string;
  slug: string;
  adminEmail: string;
  temporaryPassword: string;
  adminPanelUrl: string;
}

/**
 * Full automated onboarding — called after Stripe payment confirmed
 * Creates tenant + admin user + settings + subscription in one transaction
 * Sends welcome email with credentials
 */
export async function runOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  const {
    companyName, adminEmail, adminPhone, adminFirstName,
    adminLastName, country, currency, timezone,
    stripeCustomerId, stripeSubscriptionId, planSlug,
  } = input;

  logger.info('Starting automated onboarding', { adminEmail, planSlug });

  // Look up subscription plan
  const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: planSlug } });
  if (!plan) throw new Error(`Plan not found: ${planSlug}`);

  // Check for duplicate email
  const existing = await prisma.tenant.findFirst({ where: { email: adminEmail } });
  if (existing) {
    logger.warn('Duplicate onboarding attempt', { adminEmail });
    throw new Error('An account with this email already exists.');
  }

  // Generate unique slug
  let slug = slugify(companyName);
  const slugConflict = await prisma.tenant.findUnique({ where: { slug } });
  if (slugConflict) slug = `${slug}-${Date.now().toString(36)}`;

  // Generate secure temporary password
  const temporaryPassword = `${generateRandomString(4)}-${generateRandomString(4)}-${generateRandomString(4)}`.toUpperCase();
  const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

  const tenantId = uuidv4();
  const adminUserId = uuidv4();
  const trialDays = 0; // They already paid — no trial

  // Calculate subscription period
  const periodStart = new Date();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Run entire setup in a single atomic transaction
  await prisma.$transaction(async (tx) => {
    // 1. Create tenant
    await tx.tenant.create({
      data: {
        id: tenantId,
        name: companyName,
        slug,
        email: adminEmail,
        phone: adminPhone,
        country,
        currency,
        timezone,
        status: 'ACTIVE',
        primaryColor: '#f59e0b',
        secondaryColor: '#1F2937',
      },
    });

    // 2. Create default tenant settings (sensible defaults)
    await tx.tenantSettings.create({
      data: {
        id: uuidv4(),
        tenantId,
        allowScheduledBookings: true,
        allowCashPayments: true,
        allowCardPayments: true,
        autoAssignDriver: true,
        driverAcceptTimeoutSeconds: 30,
        maxSearchRadiusKm: 10,
        requireDriverApproval: true,
        cancellationWindowMinutes: 5,
        ratingEnabled: true,
        corporateEnabled: false,
      },
    });

    // 3. Create admin user with temporary password
    await tx.user.create({
      data: {
        id: adminUserId,
        tenantId,
        email: adminEmail,
        phone: adminPhone,
        firstName: adminFirstName,
        lastName: adminLastName,
        role: 'TENANT_ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: false,
        passwordHash,
      },
    });

    // 4. Create subscription record
    await tx.tenantSubscription.create({
      data: {
        id: uuidv4(),
        tenantId,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        stripeSubscriptionId,
        stripeCustomerId,
      },
    });

    // 5. Create first invoice record
    await tx.invoice.create({
      data: {
        id: uuidv4(),
        tenantId,
        amount: plan.priceMonthly,
        currency: plan.currency,
        status: 'PAID',
        periodStart,
        periodEnd,
        paidAt: new Date(),
        dueDate: periodEnd,
      },
    });
  });

  const adminPanelUrl = process.env.ADMIN_PANEL_URL ?? 'https://admin.taxiflow.com';

  // Send welcome email with credentials
  await sendWelcomeEmail({
    adminEmail,
    adminFirstName,
    companyName,
    tenantId,
    temporaryPassword,
    adminPanelUrl,
    planName: plan.name,
    currency: plan.currency,
    priceMonthly: plan.priceMonthly,
  });

  logger.info('✅ Onboarding complete', { tenantId, slug, adminEmail });

  return { tenantId, slug, adminEmail, temporaryPassword, adminPanelUrl };
}

// ─── WELCOME EMAIL ────────────────────────────────────────

interface WelcomeEmailInput {
  adminEmail: string;
  adminFirstName: string;
  companyName: string;
  tenantId: string;
  temporaryPassword: string;
  adminPanelUrl: string;
  planName: string;
  currency: string;
  priceMonthly: number;
}

async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<void> {
  const {
    adminEmail, adminFirstName, companyName, tenantId,
    temporaryPassword, adminPanelUrl, planName, currency, priceMonthly,
  } = input;

  await addEmailJob({
    to: adminEmail,
    subject: `🎉 Welcome to TaxiFlow — Your ${companyName} platform is ready!`,
    template: 'onboarding-welcome',
    variables: {
      firstName: adminFirstName,
      companyName,
      tenantId,
      email: adminEmail,
      temporaryPassword,
      adminPanelUrl,
      planName,
      billingAmount: `${currency} ${priceMonthly}/month`,
      setupGuideUrl: `${adminPanelUrl}/setup-guide`,
      supportEmail: 'support@taxiflow.com',
    },
  });

  logger.info('Welcome email queued', { adminEmail });
}

// ─── SEND SETUP REMINDER (Day 3 if not configured) ────────

export async function sendSetupReminder(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { apiKeys: true, settings: true },
  });

  if (!tenant) return;

  // Check if they've configured their Google Maps key
  const hasGoogleMaps = tenant.apiKeys.some(k => k.provider === 'GOOGLE_MAPS' && k.isConfigured);
  if (hasGoogleMaps) return; // Already set up — don't bug them

  const admin = await prisma.user.findFirst({
    where: { tenantId, role: 'TENANT_ADMIN' },
    select: { email: true, firstName: true },
  });

  if (!admin?.email) return;

  await addEmailJob({
    to: admin.email,
    subject: 'Complete your TaxiFlow setup — 3 steps remaining',
    template: 'setup-reminder',
    variables: {
      firstName: admin.firstName,
      companyName: tenant.name,
      adminPanelUrl: process.env.ADMIN_PANEL_URL ?? 'https://admin.taxiflow.com',
      tenantId,
    },
  });
}

// ─── CHURN PREVENTION EMAIL (subscription cancelled) ──────

export async function sendChurnPreventionEmail(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return;

  const admin = await prisma.user.findFirst({
    where: { tenantId, role: 'TENANT_ADMIN' },
    select: { email: true, firstName: true },
  });

  if (!admin?.email) return;

  await addEmailJob({
    to: admin.email,
    subject: 'We\'re sad to see you go — can we help?',
    template: 'churn-prevention',
    variables: {
      firstName: admin.firstName,
      companyName: tenant.name,
      supportEmail: 'support@taxiflow.com',
    },
  });
}
