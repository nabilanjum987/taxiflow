// ============================================================
// modules/auth/auth.routes.ts
// All auth endpoints — versioned under /api/v1/auth
// ============================================================

import { Router } from 'express';
import * as authController from './auth.controller';
import { authenticate } from '../../middleware/authMiddleware';
import { authRateLimit, otpRateLimit } from '../../middleware/rateLimitMiddleware';

const router = Router();

// Public — no auth required
router.post('/register', authRateLimit, authController.register);
router.post('/login', authRateLimit, authController.loginWithPassword);
router.post('/send-otp', otpRateLimit, authController.sendOtp);
router.post('/verify-otp', authRateLimit, authController.verifyOtp);
router.post('/refresh-token', authController.refreshToken);

// Protected — auth required
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', authenticate, authController.getMe);

export default router;
