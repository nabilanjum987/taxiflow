"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// modules/onboarding/onboarding.routes.ts
const express_1 = require("express");
const zod_1 = require("zod");
const onboarding_service_1 = require("./onboarding.service");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const responseHelpers_1 = require("../../utils/responseHelpers");
const logger_1 = require("../../config/logger");
const logger = (0, logger_1.createModuleLogger)('onboarding-routes');
const router = (0, express_1.Router)();
// POST /onboarding/manual — Super admin manually creates a tenant
// (used when client pays via invoice not Stripe)
router.post('/manual', authMiddleware_1.superAdminOnly, async (req, res, next) => {
    try {
        const input = zod_1.z.object({
            companyName: zod_1.z.string().min(1).max(100),
            adminEmail: zod_1.z.string().email(),
            adminPhone: zod_1.z.string().min(7),
            adminFirstName: zod_1.z.string().min(1).max(50),
            adminLastName: zod_1.z.string().min(1).max(50),
            country: zod_1.z.string().length(2).default('GB'),
            currency: zod_1.z.string().length(3).default('GBP'),
            timezone: zod_1.z.string().default('Europe/London'),
            planSlug: zod_1.z.enum(['starter', 'business', 'pro', 'enterprise']),
            stripeCustomerId: zod_1.z.string().default('manual'),
            stripeSubscriptionId: zod_1.z.string().default('manual'),
        }).parse(req.body);
        const result = await (0, onboarding_service_1.runOnboarding)(input);
        logger.info('Manual onboarding completed', {
            tenantId: result.tenantId,
            adminEmail: result.adminEmail,
            byAdmin: req.user.id,
        });
        (0, responseHelpers_1.sendCreated)(res, {
            tenantId: result.tenantId,
            slug: result.slug,
            adminPanelUrl: result.adminPanelUrl,
            message: 'Tenant created and welcome email sent',
        });
    }
    catch (e) {
        next(e);
    }
});
// POST /onboarding/resend-welcome — Resend welcome email
router.post('/resend-welcome/:tenantId', authMiddleware_1.superAdminOnly, async (req, res, next) => {
    try {
        await (0, onboarding_service_1.sendSetupReminder)(req.params.tenantId);
        (0, responseHelpers_1.sendSuccess)(res, null, 'Setup reminder sent');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=onboarding.routes.js.map