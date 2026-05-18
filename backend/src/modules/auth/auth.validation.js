"use strict";
// ============================================================
// modules/auth/auth.validation.ts
// Zod schemas — agent.md: validate input on EVERY endpoint
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTokenSchema = exports.verifyOtpSchema = exports.sendOtpSchema = exports.loginPasswordSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        phone: zod_1.z
            .string()
            .min(7, 'Phone number too short')
            .max(20, 'Phone number too long')
            .regex(/^\+?[0-9\s\-().]+$/, 'Invalid phone number format'),
        email: zod_1.z.string().email('Invalid email address').optional(),
        firstName: zod_1.z.string().min(1, 'First name required').max(50),
        lastName: zod_1.z.string().min(1, 'Last name required').max(50),
        password: zod_1.z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[0-9]/, 'Password must contain at least one number')
            .optional(),
    }),
});
exports.loginPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
exports.sendOtpSchema = zod_1.z.object({
    body: zod_1.z.object({
        phone: zod_1.z
            .string()
            .min(7)
            .max(20)
            .regex(/^\+?[0-9\s\-().]+$/, 'Invalid phone number'),
    }),
});
exports.verifyOtpSchema = zod_1.z.object({
    body: zod_1.z.object({
        phone: zod_1.z
            .string()
            .min(7)
            .max(20)
            .regex(/^\+?[0-9\s\-().]+$/, 'Invalid phone number'),
        code: zod_1.z
            .string()
            .length(6, 'OTP must be 6 digits')
            .regex(/^\d{6}$/, 'OTP must be numeric'),
    }),
});
exports.refreshTokenSchema = zod_1.z.object({
    body: zod_1.z.object({
        refreshToken: zod_1.z.string().min(1, 'Refresh token is required').optional(),
    }),
});
//# sourceMappingURL=auth.validation.js.map