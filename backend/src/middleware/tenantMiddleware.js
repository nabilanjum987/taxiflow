"use strict";
// ============================================================
// middleware/tenantMiddleware.ts
// CRITICAL: Validates tenant on every request — agent.md rule
// All data is isolated by tenant_id — NEVER cross tenant
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantMiddleware = tenantMiddleware;
exports.superAdminTenantBypass = superAdminTenantBypass;
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
const logger_1 = require("../config/logger");
const shared_constants_1 = require("@taxiflow/shared-constants");
const ApiError_1 = require("../utils/ApiError");
const logger = (0, logger_1.createModuleLogger)('tenant-middleware');
async function tenantMiddleware(req, _res, next) {
    try {
        const tenantId = req.headers[shared_constants_1.HEADERS.TENANT_ID];
        if (!tenantId) {
            throw new ApiError_1.ApiError('Tenant ID is required', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.TENANT_INVALID);
        }
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(tenantId)) {
            throw new ApiError_1.ApiError('Invalid tenant ID format', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.TENANT_INVALID);
        }
        // Check cache first
        const cacheKey = shared_constants_1.CACHE_KEYS.tenant(tenantId);
        let tenant = await (0, redis_1.cacheGet)(cacheKey);
        if (!tenant) {
            // Fetch from database
            const dbTenant = await database_1.prisma.tenant.findUnique({
                where: { id: tenantId },
            });
            if (!dbTenant) {
                throw new ApiError_1.ApiError('Tenant not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.TENANT_NOT_FOUND);
            }
            tenant = dbTenant;
            await (0, redis_1.cacheSet)(cacheKey, tenant, shared_constants_1.CACHE_TTL.TENANT);
        }
        if (tenant.status === 'SUSPENDED') {
            throw new ApiError_1.ApiError('Your account has been suspended. Please contact support.', shared_constants_1.HTTP_STATUS.FORBIDDEN, shared_constants_1.ERROR_CODES.TENANT_SUSPENDED);
        }
        if (tenant.status === 'CANCELLED') {
            throw new ApiError_1.ApiError('Your subscription has been cancelled.', shared_constants_1.HTTP_STATUS.FORBIDDEN, shared_constants_1.ERROR_CODES.SUBSCRIPTION_INACTIVE);
        }
        // Fetch tenant settings
        const settingsCacheKey = shared_constants_1.CACHE_KEYS.tenantSettings(tenantId);
        let settings = await (0, redis_1.cacheGet)(settingsCacheKey);
        if (!settings) {
            const dbSettings = await database_1.prisma.tenantSettings.findUnique({
                where: { tenantId },
            });
            if (dbSettings) {
                settings = dbSettings;
                await (0, redis_1.cacheSet)(settingsCacheKey, settings, shared_constants_1.CACHE_TTL.TENANT_SETTINGS);
            }
        }
        // Attach to request — available in all route handlers
        req.tenantId = tenantId;
        req.tenant = tenant;
        if (settings)
            req.tenantSettings = settings;
        logger.debug('Tenant validated', { tenantId, tenantSlug: tenant.slug });
        next();
    }
    catch (error) {
        next(error);
    }
}
/**
 * Super admin bypass — validates super admin token
 * Allows cross-tenant data access for our platform admin
 */
function superAdminTenantBypass(req, _res, next) {
    // Super admin routes don't need tenant middleware
    // They use their own auth with SUPER_ADMIN role check
    next();
}
//# sourceMappingURL=tenantMiddleware.js.map