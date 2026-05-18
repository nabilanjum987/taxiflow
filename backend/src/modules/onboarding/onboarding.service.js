"use strict";
// ============================================================
// modules/onboarding/onboarding.service.ts
// agent.md Step 6-11: Payment confirmed → tenant created →
// credentials emailed → client enters API keys → LIVE
// Zero manual work from us
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOnboarding = runOnboarding;
exports.sendSetupReminder = sendSetupReminder;
exports.sendChurnPreventionEmail = sendChurnPreventionEmail;
const uuid_1 = require("uuid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../../config/database");
const logger_1 = require("../../config/logger");
const queues_1 = require("../../jobs/queues");
const shared_constants_1 = require("@taxiflow/shared-constants");
const shared_utils_1 = require("@taxiflow/shared-utils");
const logger = (0, logger_1.createModuleLogger)('onboarding-service');
/**
 * Full automated onboarding — called after Stripe payment confirmed
 * Creates tenant + admin user + settings + subscription in one transaction
 * Sends welcome email with credentials
 */
async function runOnboarding(input) {
    const { companyName, adminEmail, adminPhone, adminFirstName, adminLastName, country, currency, timezone, stripeCustomerId, stripeSubscriptionId, planSlug, } = input;
    logger.info('Starting automated onboarding', { adminEmail, planSlug });
    // Look up subscription plan
    const plan = await database_1.prisma.subscriptionPlan.findUnique({ where: { slug: planSlug } });
    if (!plan)
        throw new Error(`Plan not found: ${planSlug}`);
    // Check for duplicate email
    const existing = await database_1.prisma.tenant.findFirst({ where: { email: adminEmail } });
    if (existing) {
        logger.warn('Duplicate onboarding attempt', { adminEmail });
        throw new Error('An account with this email already exists.');
    }
    // Generate unique slug
    let slug = (0, shared_utils_1.slugify)(companyName);
    const slugConflict = await database_1.prisma.tenant.findUnique({ where: { slug } });
    if (slugConflict)
        slug = `${slug}-${Date.now().toString(36)}`;
    // Generate secure temporary password
    const temporaryPassword = `${(0, shared_utils_1.generateRandomString)(4)}-${(0, shared_utils_1.generateRandomString)(4)}-${(0, shared_utils_1.generateRandomString)(4)}`.toUpperCase();
    const passwordHash = await bcryptjs_1.default.hash(temporaryPassword, shared_constants_1.BCRYPT_ROUNDS);
    const tenantId = (0, uuid_1.v4)();
    const adminUserId = (0, uuid_1.v4)();
    const trialDays = 0; // They already paid — no trial
    // Calculate subscription period
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    // Run entire setup in a single atomic transaction
    await database_1.prisma.$transaction(async (tx) => {
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
                id: (0, uuid_1.v4)(),
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
                id: (0, uuid_1.v4)(),
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
                id: (0, uuid_1.v4)(),
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
async function sendWelcomeEmail(input) {
    const { adminEmail, adminFirstName, companyName, tenantId, temporaryPassword, adminPanelUrl, planName, currency, priceMonthly, } = input;
    await (0, queues_1.addEmailJob)({
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
async function sendSetupReminder(tenantId) {
    const tenant = await database_1.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { apiKeys: true, settings: true },
    });
    if (!tenant)
        return;
    // Check if they've configured their Google Maps key
    const hasGoogleMaps = tenant.apiKeys.some(k => k.provider === 'GOOGLE_MAPS' && k.isConfigured);
    if (hasGoogleMaps)
        return; // Already set up — don't bug them
    const admin = await database_1.prisma.user.findFirst({
        where: { tenantId, role: 'TENANT_ADMIN' },
        select: { email: true, firstName: true },
    });
    if (!admin?.email)
        return;
    await (0, queues_1.addEmailJob)({
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
async function sendChurnPreventionEmail(tenantId) {
    const tenant = await database_1.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant)
        return;
    const admin = await database_1.prisma.user.findFirst({
        where: { tenantId, role: 'TENANT_ADMIN' },
        select: { email: true, firstName: true },
    });
    if (!admin?.email)
        return;
    await (0, queues_1.addEmailJob)({
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
//# sourceMappingURL=onboarding.service.js.map