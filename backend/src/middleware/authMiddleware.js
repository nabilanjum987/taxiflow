"use strict";
// ============================================================
// middleware/authMiddleware.ts
// JWT verification + role-based access control
// agent.md: NEVER create endpoints without authentication
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
exports.superAdminOnly = superAdminOnly;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const env_1 = require("../config/env");
const shared_constants_1 = require("@taxiflow/shared-constants");
const ApiError_1 = require("../utils/ApiError");
const logger = (0, logger_1.createModuleLogger)('auth-middleware');
async function authenticate(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError_1.ApiError('Access token is required', shared_constants_1.HTTP_STATUS.UNAUTHORIZED, shared_constants_1.ERROR_CODES.TOKEN_INVALID);
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new ApiError_1.ApiError('Access token is required', shared_constants_1.HTTP_STATUS.UNAUTHORIZED, shared_constants_1.ERROR_CODES.TOKEN_INVALID);
        }
        // Verify JWT
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
        }
        catch (err) {
            if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new ApiError_1.ApiError('Access token expired', shared_constants_1.HTTP_STATUS.UNAUTHORIZED, shared_constants_1.ERROR_CODES.TOKEN_EXPIRED);
            }
            throw new ApiError_1.ApiError('Invalid access token', shared_constants_1.HTTP_STATUS.UNAUTHORIZED, shared_constants_1.ERROR_CODES.TOKEN_INVALID);
        }
        // Fetch user from DB — verifies they still exist + not suspended
        const user = await database_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                tenantId: true,
                email: true,
                phone: true,
                firstName: true,
                lastName: true,
                role: true,
                status: true,
            },
        });
        if (!user) {
            throw new ApiError_1.ApiError('User not found', shared_constants_1.HTTP_STATUS.UNAUTHORIZED, shared_constants_1.ERROR_CODES.TOKEN_INVALID);
        }
        if (user.status === 'SUSPENDED') {
            throw new ApiError_1.ApiError('Your account has been suspended', shared_constants_1.HTTP_STATUS.FORBIDDEN, shared_constants_1.ERROR_CODES.ACCOUNT_SUSPENDED);
        }
        if (user.status === 'INACTIVE') {
            throw new ApiError_1.ApiError('Your account is inactive', shared_constants_1.HTTP_STATUS.FORBIDDEN, shared_constants_1.ERROR_CODES.ACCOUNT_SUSPENDED);
        }
        // For non-super-admin users, ensure tenant matches
        if (user.role !== 'SUPER_ADMIN' && req.tenantId && user.tenantId !== req.tenantId) {
            logger.warn('Tenant mismatch attempted', {
                userId: user.id,
                userTenantId: user.tenantId,
                requestTenantId: req.tenantId,
            });
            throw new ApiError_1.ApiError('Access denied', shared_constants_1.HTTP_STATUS.FORBIDDEN, shared_constants_1.ERROR_CODES.FORBIDDEN);
        }
        req.user = {
            id: user.id,
            tenantId: user.tenantId,
            role: user.role,
            email: user.email,
            phone: user.phone,
            firstName: user.firstName,
            lastName: user.lastName,
        };
        next();
    }
    catch (error) {
        next(error);
    }
}
/**
 * Role-based access control middleware factory
 * Usage: authorize('TENANT_ADMIN', 'DISPATCHER')
 */
function authorize(...roles) {
    return (req, _res, next) => {
        if (!req.user) {
            next(new ApiError_1.ApiError('Authentication required', shared_constants_1.HTTP_STATUS.UNAUTHORIZED, shared_constants_1.ERROR_CODES.TOKEN_INVALID));
            return;
        }
        if (!roles.includes(req.user.role)) {
            logger.warn('Unauthorized role access attempted', {
                userId: req.user.id,
                userRole: req.user.role,
                requiredRoles: roles,
                path: req.path,
            });
            next(new ApiError_1.ApiError('You do not have permission to access this resource', shared_constants_1.HTTP_STATUS.FORBIDDEN, shared_constants_1.ERROR_CODES.FORBIDDEN));
            return;
        }
        next();
    };
}
/**
 * Super admin only access
 */
function superAdminOnly(req, _res, next) {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
        next(new ApiError_1.ApiError('Super admin access required', shared_constants_1.HTTP_STATUS.FORBIDDEN, shared_constants_1.ERROR_CODES.FORBIDDEN));
        return;
    }
    next();
}
//# sourceMappingURL=authMiddleware.js.map