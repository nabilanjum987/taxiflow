"use strict";
// ============================================================
// modules/auth/auth.controller.ts
// HTTP handlers — thin layer, delegates to auth.service.ts
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
exports.register = register;
exports.loginWithPassword = loginWithPassword;
exports.sendOtp = sendOtp;
exports.verifyOtp = verifyOtp;
exports.refreshToken = refreshToken;
exports.logout = logout;
exports.logoutAll = logoutAll;
exports.getMe = getMe;
const authService = __importStar(require("./auth.service"));
const auth_validation_1 = require("./auth.validation");
const responseHelpers_1 = require("../../utils/responseHelpers");
const shared_constants_1 = require("@taxiflow/shared-constants");
const logger_1 = require("../../config/logger");
const env_1 = require("../../config/env");
const logger = (0, logger_1.createModuleLogger)('auth-controller');
// POST /auth/register
async function register(req, res, next) {
    try {
        const { body } = auth_validation_1.registerSchema.parse({ body: req.body });
        const user = await authService.registerUser({
            tenantId: req.tenantId,
            ...body,
            role: 'PASSENGER', // public registration always creates passengers
        });
        (0, responseHelpers_1.sendCreated)(res, user, 'Registration successful. Please verify your phone number.');
    }
    catch (error) {
        next(error);
    }
}
// POST /auth/login
async function loginWithPassword(req, res, next) {
    try {
        const { body } = auth_validation_1.loginPasswordSchema.parse({ body: req.body });
        const result = await authService.loginWithPassword(req.tenantId, body.email, body.password);
        const { tokens, ...user } = result;
        // Store refresh token in httpOnly cookie
        res.cookie(shared_constants_1.JWT_CONFIG.REFRESH_TOKEN_COOKIE_NAME, tokens.accessToken, {
            httpOnly: true,
            secure: env_1.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
        (0, responseHelpers_1.sendSuccess)(res, { user, accessToken: tokens.accessToken, expiresIn: tokens.expiresIn });
    }
    catch (error) {
        next(error);
    }
}
// POST /auth/send-otp
async function sendOtp(req, res, next) {
    try {
        const { body } = auth_validation_1.sendOtpSchema.parse({ body: req.body });
        await authService.sendOtp(req.tenantId, body.phone);
        (0, responseHelpers_1.sendSuccess)(res, null, 'OTP sent successfully');
    }
    catch (error) {
        next(error);
    }
}
// POST /auth/verify-otp
async function verifyOtp(req, res, next) {
    try {
        const { body } = auth_validation_1.verifyOtpSchema.parse({ body: req.body });
        const result = await authService.verifyOtp(req.tenantId, body.phone, body.code);
        const { tokens, ...user } = result;
        res.cookie(shared_constants_1.JWT_CONFIG.REFRESH_TOKEN_COOKIE_NAME, tokens.accessToken, {
            httpOnly: true,
            secure: env_1.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        (0, responseHelpers_1.sendSuccess)(res, { user, accessToken: tokens.accessToken, expiresIn: tokens.expiresIn });
    }
    catch (error) {
        next(error);
    }
}
// POST /auth/refresh-token
async function refreshToken(req, res, next) {
    try {
        // Try cookie first, then body
        const token = req.cookies[shared_constants_1.JWT_CONFIG.REFRESH_TOKEN_COOKIE_NAME] ||
            req.body.refreshToken;
        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Refresh token is required',
                code: 'TOKEN_INVALID',
                statusCode: 401,
            });
            return;
        }
        const tokens = await authService.refreshAccessToken(token);
        res.cookie(shared_constants_1.JWT_CONFIG.REFRESH_TOKEN_COOKIE_NAME, tokens.accessToken, {
            httpOnly: true,
            secure: env_1.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        (0, responseHelpers_1.sendSuccess)(res, { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn });
    }
    catch (error) {
        next(error);
    }
}
// POST /auth/logout
async function logout(req, res, next) {
    try {
        const token = req.cookies[shared_constants_1.JWT_CONFIG.REFRESH_TOKEN_COOKIE_NAME] ||
            req.body.refreshToken;
        if (token) {
            await authService.logout(token);
        }
        res.clearCookie(shared_constants_1.JWT_CONFIG.REFRESH_TOKEN_COOKIE_NAME);
        (0, responseHelpers_1.sendSuccess)(res, null, 'Logged out successfully');
    }
    catch (error) {
        next(error);
    }
}
// POST /auth/logout-all
async function logoutAll(req, res, next) {
    try {
        await authService.logoutAllDevices(req.user.id);
        res.clearCookie(shared_constants_1.JWT_CONFIG.REFRESH_TOKEN_COOKIE_NAME);
        (0, responseHelpers_1.sendSuccess)(res, null, 'All sessions terminated');
    }
    catch (error) {
        next(error);
    }
}
// GET /auth/me
async function getMe(req, res, next) {
    try {
        (0, responseHelpers_1.sendSuccess)(res, req.user);
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=auth.controller.js.map