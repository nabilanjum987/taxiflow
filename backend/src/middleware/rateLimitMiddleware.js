"use strict";
// ============================================================
// middleware/rateLimitMiddleware.ts
// agent.md: Rate limiting on ALL auth endpoints
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRateLimit = exports.otpRateLimit = exports.authRateLimit = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const shared_constants_1 = require("@taxiflow/shared-constants");
// Auth endpoints — strict limiting
exports.authRateLimit = (0, express_rate_limit_1.default)({
    windowMs: shared_constants_1.RATE_LIMITS.AUTH_WINDOW_MINUTES * 60 * 1000,
    max: shared_constants_1.RATE_LIMITS.AUTH_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many requests from this IP. Please try again later.',
        code: shared_constants_1.ERROR_CODES.RATE_LIMIT_EXCEEDED,
        statusCode: shared_constants_1.HTTP_STATUS.TOO_MANY_REQUESTS,
    },
    skip: (req) => {
        // Skip rate limit in test environment
        return process.env.NODE_ENV === 'test';
    },
});
// OTP requests — very strict
exports.otpRateLimit = (0, express_rate_limit_1.default)({
    windowMs: shared_constants_1.RATE_LIMITS.OTP_WINDOW_MINUTES * 60 * 1000,
    max: shared_constants_1.RATE_LIMITS.OTP_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limit by phone number, not IP
        const body = req.body;
        return body.phone ?? req.ip ?? 'unknown';
    },
    message: {
        success: false,
        error: 'Too many OTP requests. Please try again in an hour.',
        code: shared_constants_1.ERROR_CODES.RATE_LIMIT_EXCEEDED,
        statusCode: shared_constants_1.HTTP_STATUS.TOO_MANY_REQUESTS,
    },
});
// General API rate limit
exports.apiRateLimit = (0, express_rate_limit_1.default)({
    windowMs: shared_constants_1.RATE_LIMITS.API_WINDOW_MINUTES * 60 * 1000,
    max: shared_constants_1.RATE_LIMITS.API_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Rate limit exceeded. Please slow down.',
        code: shared_constants_1.ERROR_CODES.RATE_LIMIT_EXCEEDED,
        statusCode: shared_constants_1.HTTP_STATUS.TOO_MANY_REQUESTS,
    },
    skip: () => process.env.NODE_ENV === 'test',
});
//# sourceMappingURL=rateLimitMiddleware.js.map