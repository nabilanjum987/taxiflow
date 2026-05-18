"use strict";
// ============================================================
// modules/tenants/tenants.routes.ts
// ============================================================
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
const express_1 = require("express");
const zod_1 = require("zod");
const tenantsService = __importStar(require("./tenants.service"));
const authMiddleware_1 = require("../../middleware/authMiddleware");
const responseHelpers_1 = require("../../utils/responseHelpers");
const shared_utils_1 = require("@taxiflow/shared-utils");
const router = (0, express_1.Router)();
// All tenant routes require authentication
router.use(authMiddleware_1.authenticate);
// ─── TENANT ADMIN ROUTES ──────────────────────────────────
// GET /tenants/me — get current tenant info
router.get('/me', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const tenant = await tenantsService.getTenantById(req.tenantId);
        (0, responseHelpers_1.sendSuccess)(res, tenant);
    }
    catch (e) {
        next(e);
    }
});
// PATCH /tenants/me/branding
const brandingSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    logoUrl: zod_1.z.string().url().optional(),
    primaryColor: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondaryColor: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});
router.patch('/me/branding', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const input = brandingSchema.parse(req.body);
        const tenant = await tenantsService.updateTenantBranding(req.tenantId, input);
        (0, responseHelpers_1.sendSuccess)(res, tenant, 'Branding updated');
    }
    catch (e) {
        next(e);
    }
});
// PATCH /tenants/me/settings
router.patch('/me/settings', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const settings = await tenantsService.updateTenantSettings(req.tenantId, req.body);
        (0, responseHelpers_1.sendSuccess)(res, settings, 'Settings updated');
    }
    catch (e) {
        next(e);
    }
});
// GET /tenants/me/api-keys — returns masked keys only, NEVER plain text
router.get('/me/api-keys', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const keys = await tenantsService.getApiKeyStatuses(req.tenantId);
        (0, responseHelpers_1.sendSuccess)(res, keys);
    }
    catch (e) {
        next(e);
    }
});
// POST /tenants/me/api-keys — store encrypted API key
const apiKeySchema = zod_1.z.object({
    provider: zod_1.z.enum(['GOOGLE_MAPS', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'STRIPE_PUBLISHABLE', 'STRIPE_SECRET']),
    key: zod_1.z.string().min(1, 'API key is required'),
});
router.post('/me/api-keys', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const { provider, key } = apiKeySchema.parse(req.body);
        await tenantsService.storeApiKey(req.tenantId, provider, key);
        (0, responseHelpers_1.sendSuccess)(res, null, 'API key saved securely');
    }
    catch (e) {
        next(e);
    }
});
// ─── SUPER ADMIN ROUTES ───────────────────────────────────
// GET /tenants — all tenants (super admin only)
router.get('/', authMiddleware_1.superAdminOnly, async (req, res, next) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const { tenants, total } = await tenantsService.getAllTenants(page, limit);
        const pagination = (0, shared_utils_1.buildPagination)(page, limit, total);
        (0, responseHelpers_1.sendPaginated)(res, tenants, pagination);
    }
    catch (e) {
        next(e);
    }
});
// POST /tenants/:id/suspend
router.post('/:id/suspend', authMiddleware_1.superAdminOnly, async (req, res, next) => {
    try {
        const { reason } = zod_1.z.object({ reason: zod_1.z.string().min(1) }).parse(req.body);
        await tenantsService.suspendTenant(req.params.id, reason);
        (0, responseHelpers_1.sendSuccess)(res, null, 'Tenant suspended');
    }
    catch (e) {
        next(e);
    }
});
// POST /tenants/:id/activate
router.post('/:id/activate', authMiddleware_1.superAdminOnly, async (req, res, next) => {
    try {
        await tenantsService.activateTenant(req.params.id);
        (0, responseHelpers_1.sendSuccess)(res, null, 'Tenant activated');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=tenants.routes.js.map