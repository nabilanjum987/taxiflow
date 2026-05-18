"use strict";
// ============================================================
// modules/tenants/tenants.service.ts
// Tenant management + automated onboarding flow
// agent.md: Step 6 — auto-creates tenant after payment
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTenant = createTenant;
exports.getTenantById = getTenantById;
exports.updateTenantBranding = updateTenantBranding;
exports.updateTenantSettings = updateTenantSettings;
exports.storeApiKey = storeApiKey;
exports.getDecryptedApiKey = getDecryptedApiKey;
exports.getApiKeyStatuses = getApiKeyStatuses;
exports.getAllTenants = getAllTenants;
exports.suspendTenant = suspendTenant;
exports.activateTenant = activateTenant;
const uuid_1 = require("uuid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../../config/database");
const redis_1 = require("../../config/redis");
const logger_1 = require("../../config/logger");
const shared_constants_1 = require("@taxiflow/shared-constants");
const shared_utils_1 = require("@taxiflow/shared-utils");
const encryption_1 = require("../../utils/encryption");
const shared_utils_2 = require("@taxiflow/shared-utils");
const ApiError_1 = require("../../utils/ApiError");
const logger = (0, logger_1.createModuleLogger)('tenants-service');
async function createTenant(input) {
    const { name, email, phone, country, currency, timezone, adminFirstName, adminLastName, adminPassword, subscriptionPlanId, stripeCustomerId, stripeSubscriptionId, } = input;
    // Check email uniqueness
    const existing = await database_1.prisma.tenant.findFirst({ where: { email } });
    if (existing) {
        throw new ApiError_1.ApiError('Email already in use', shared_constants_1.HTTP_STATUS.CONFLICT, shared_constants_1.ERROR_CODES.EMAIL_ALREADY_EXISTS);
    }
    // Generate unique slug from company name
    let slug = (0, shared_utils_1.slugify)(name);
    const slugExists = await database_1.prisma.tenant.findUnique({ where: { slug } });
    if (slugExists) {
        slug = `${slug}-${Date.now().toString(36)}`;
    }
    // Hash admin password
    const passwordHash = await bcryptjs_1.default.hash(adminPassword, shared_constants_1.BCRYPT_ROUNDS);
    const tenantId = (0, uuid_1.v4)();
    const adminUserId = (0, uuid_1.v4)();
    // Run entire onboarding in a single transaction
    const result = await database_1.prisma.$transaction(async (tx) => {
        // 1. Create tenant
        const tenant = await tx.tenant.create({
            data: {
                id: tenantId,
                name,
                slug,
                email,
                phone,
                country,
                currency,
                timezone,
                status: 'TRIAL',
            },
        });
        // 2. Create default tenant settings
        await tx.tenantSettings.create({
            data: {
                id: (0, uuid_1.v4)(),
                tenantId,
            },
        });
        // 3. Create admin user
        await tx.user.create({
            data: {
                id: adminUserId,
                tenantId,
                email,
                phone,
                firstName: adminFirstName,
                lastName: adminLastName,
                role: 'TENANT_ADMIN',
                status: 'ACTIVE',
                emailVerified: true,
                phoneVerified: true,
                passwordHash,
            },
        });
        // 4. Link subscription
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial
        await tx.tenantSubscription.create({
            data: {
                id: (0, uuid_1.v4)(),
                tenantId,
                planId: subscriptionPlanId,
                status: 'TRIALING',
                currentPeriodStart: new Date(),
                currentPeriodEnd: trialEnd,
                stripeSubscriptionId: stripeSubscriptionId ?? null,
                stripeCustomerId: stripeCustomerId ?? null,
            },
        });
        return tenant;
    });
    logger.info('Tenant created via automated onboarding', { tenantId, slug });
    return {
        tenant: result,
        adminCredentials: {
            email,
            temporaryPassword: adminPassword,
        },
    };
}
// ─── GET TENANT ───────────────────────────────────────────
async function getTenantById(tenantId) {
    const cached = await database_1.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!cached) {
        throw new ApiError_1.ApiError('Tenant not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.TENANT_NOT_FOUND);
    }
    return cached;
}
async function updateTenantBranding(tenantId, input) {
    const updated = await database_1.prisma.tenant.update({
        where: { id: tenantId },
        data: input,
    });
    // Bust cache
    await (0, redis_1.cacheDel)(shared_constants_1.CACHE_KEYS.tenant(tenantId));
    logger.info('Tenant branding updated', { tenantId });
    return updated;
}
// ─── UPDATE TENANT SETTINGS ───────────────────────────────
async function updateTenantSettings(tenantId, input) {
    const updated = await database_1.prisma.tenantSettings.upsert({
        where: { tenantId },
        create: { id: (0, uuid_1.v4)(), tenantId, ...input },
        update: input,
    });
    await (0, redis_1.cacheDel)(shared_constants_1.CACHE_KEYS.tenantSettings(tenantId));
    logger.info('Tenant settings updated', { tenantId });
    return updated;
}
// ─── API KEY MANAGEMENT ───────────────────────────────────
/**
 * Store a client's API key — encrypted at rest per agent.md security rules
 * Client provides their own keys — we NEVER use our keys for client ops
 */
async function storeApiKey(tenantId, provider, plainTextKey) {
    const encrypted = (0, encryption_1.encryptApiKey)(plainTextKey);
    await database_1.prisma.tenantApiKey.upsert({
        where: { tenantId_provider: { tenantId, provider } },
        create: {
            id: (0, uuid_1.v4)(),
            tenantId,
            provider,
            encryptedKey: encrypted.encryptedKey,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            isConfigured: true,
        },
        update: {
            encryptedKey: encrypted.encryptedKey,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            isConfigured: true,
        },
    });
    // Bust API keys cache
    await (0, redis_1.cacheDel)(shared_constants_1.CACHE_KEYS.tenantApiKeys(tenantId));
    logger.info('API key stored (encrypted)', { tenantId, provider });
}
/**
 * Retrieve decrypted API key for a tenant — for internal backend use only
 * NEVER return decrypted keys in API responses
 */
async function getDecryptedApiKey(tenantId, provider) {
    const record = await database_1.prisma.tenantApiKey.findUnique({
        where: { tenantId_provider: { tenantId, provider } },
    });
    if (!record || !record.isConfigured) {
        throw new ApiError_1.ApiError(`API key for ${provider} not configured. Please add it in Settings.`, shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    return (0, encryption_1.decryptApiKey)({
        encryptedKey: record.encryptedKey,
        iv: record.iv,
        authTag: record.authTag,
    });
}
/**
 * Get API key statuses — masked, safe to return to admin panel
 * NEVER returns actual key values
 */
async function getApiKeyStatuses(tenantId) {
    const keys = await database_1.prisma.tenantApiKey.findMany({
        where: { tenantId },
    });
    return keys.map((k) => ({
        provider: k.provider,
        isConfigured: k.isConfigured,
        maskedKey: k.isConfigured
            ? (0, shared_utils_2.maskApiKey)(k.encryptedKey.slice(0, 16)) // only mask, not decrypt
            : undefined,
    }));
}
// ─── SUPER ADMIN — ALL TENANTS ────────────────────────────
async function getAllTenants(page, limit) {
    const skip = (page - 1) * limit;
    const [tenants, total] = await Promise.all([
        database_1.prisma.tenant.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: { subscription: { include: { plan: true } } },
        }),
        database_1.prisma.tenant.count(),
    ]);
    return { tenants: tenants, total };
}
async function suspendTenant(tenantId, reason) {
    await database_1.prisma.tenant.update({
        where: { id: tenantId },
        data: { status: 'SUSPENDED' },
    });
    await (0, redis_1.cacheDel)(shared_constants_1.CACHE_KEYS.tenant(tenantId));
    logger.info('Tenant suspended', { tenantId, reason });
}
async function activateTenant(tenantId) {
    await database_1.prisma.tenant.update({
        where: { id: tenantId },
        data: { status: 'ACTIVE' },
    });
    await (0, redis_1.cacheDel)(shared_constants_1.CACHE_KEYS.tenant(tenantId));
    logger.info('Tenant activated', { tenantId });
}
//# sourceMappingURL=tenants.service.js.map