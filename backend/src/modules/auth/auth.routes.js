"use strict";
// ============================================================
// modules/auth/auth.routes.ts
// All auth endpoints — versioned under /api/v1/auth
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
const authController = __importStar(require("./auth.controller"));
const authMiddleware_1 = require("../../middleware/authMiddleware");
const rateLimitMiddleware_1 = require("../../middleware/rateLimitMiddleware");
const router = (0, express_1.Router)();
// Public — no auth required
router.post('/register', rateLimitMiddleware_1.authRateLimit, authController.register);
router.post('/login', rateLimitMiddleware_1.authRateLimit, authController.loginWithPassword);
router.post('/send-otp', rateLimitMiddleware_1.otpRateLimit, authController.sendOtp);
router.post('/verify-otp', rateLimitMiddleware_1.authRateLimit, authController.verifyOtp);
router.post('/refresh-token', authController.refreshToken);
// Protected — auth required
router.post('/logout', authMiddleware_1.authenticate, authController.logout);
router.post('/logout-all', authMiddleware_1.authenticate, authController.logoutAll);
router.get('/me', authMiddleware_1.authenticate, authController.getMe);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map