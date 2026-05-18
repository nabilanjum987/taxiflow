"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// modules/subscriptions/subscriptions.routes.ts
const express_1 = require("express");
const zod_1 = require("zod");
const subscriptionsService = __importStar(require("./subscriptions.service"));
const authMiddleware_1 = require("../../middleware/authMiddleware");
const responseHelpers_1 = require("../../utils/responseHelpers");
const router = (0, express_1.Router)();
// Public — create checkout session (called from landing page)
router.post('/checkout', async (req, res, next) => {
    try {
        const input = zod_1.z.object({
            planSlug: zod_1.z.enum(['starter', 'business', 'pro', 'enterprise']),
            companyName: zod_1.z.string().min(1).max(100),
            adminEmail: zod_1.z.string().email(),
            adminPhone: zod_1.z.string().min(7),
            adminFirstName: zod_1.z.string().min(1).max(50),
            adminLastName: zod_1.z.string().min(1).max(50),
            country: zod_1.z.string().length(2).default('GB'),
            currency: zod_1.z.string().length(3).default('GBP'),
            timezone: zod_1.z.string().default('Europe/London'),
            successUrl: zod_1.z.string().url(),
            cancelUrl: zod_1.z.string().url(),
        }).parse(req.body);
        const result = await subscriptionsService.createCheckoutSession(input);
        (0, responseHelpers_1.sendSuccess)(res, result);
    }
    catch (e) {
        next(e);
    }
});
// GET /subscriptions/plans — list all plans (public)
router.get('/plans', async (req, res, next) => {
    try {
        const plans = await subscriptionsService.getAvailablePlans();
        (0, responseHelpers_1.sendSuccess)(res, plans);
    }
    catch (e) {
        next(e);
    }
});
// All routes below require authentication
router.use(authMiddleware_1.authenticate);
// GET /subscriptions/status — tenant's current subscription
router.get('/status', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const status = await subscriptionsService.getSubscriptionStatus(req.tenantId);
        (0, responseHelpers_1.sendSuccess)(res, status);
    }
    catch (e) {
        next(e);
    }
});
// GET /subscriptions/billing-portal — redirect to Stripe billing portal
router.get('/billing-portal', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const returnUrl = req.query.returnUrl ?? `${process.env.ADMIN_PANEL_URL}/settings`;
        const url = await subscriptionsService.createCustomerPortalSession(req.tenantId, returnUrl);
        (0, responseHelpers_1.sendSuccess)(res, { url });
    }
    catch (e) {
        next(e);
    }
});
// POST /subscriptions/change-plan
router.post('/change-plan', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const { planSlug } = zod_1.z.object({ planSlug: zod_1.z.enum(['starter', 'business', 'pro', 'enterprise']) }).parse(req.body);
        await subscriptionsService.changePlan(req.tenantId, planSlug);
        (0, responseHelpers_1.sendSuccess)(res, null, 'Plan changed successfully');
    }
    catch (e) {
        next(e);
    }
});
// POST /subscriptions/cancel
router.post('/cancel', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const { cancelImmediately } = zod_1.z.object({ cancelImmediately: zod_1.z.boolean().default(false) }).parse(req.body);
        await subscriptionsService.cancelSubscription(req.tenantId, cancelImmediately);
        (0, responseHelpers_1.sendSuccess)(res, null, cancelImmediately ? 'Subscription cancelled' : 'Subscription will cancel at end of billing period');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=subscriptions.routes.js.map