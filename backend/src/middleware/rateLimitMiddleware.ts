// ============================================================
// middleware/rateLimitMiddleware.ts
// agent.md: Rate limiting on ALL auth endpoints
// ============================================================

import rateLimit from 'express-rate-limit';
import { RATE_LIMITS, HTTP_STATUS, ERROR_CODES } from '@taxiflow/shared-constants';

// Auth endpoints — strict limiting
export const authRateLimit = rateLimit({
  windowMs: RATE_LIMITS.AUTH_WINDOW_MINUTES * 60 * 1000,
  max: RATE_LIMITS.AUTH_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again later.',
    code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
  },
  skip: (req) => {
    // Skip rate limit in test environment
    return process.env.NODE_ENV === 'test';
  },
});

// OTP requests — very strict
export const otpRateLimit = rateLimit({
  windowMs: RATE_LIMITS.OTP_WINDOW_MINUTES * 60 * 1000,
  max: RATE_LIMITS.OTP_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by phone number, not IP
    const body = req.body as { phone?: string };
    return body.phone ?? req.ip ?? 'unknown';
  },
  message: {
    success: false,
    error: 'Too many OTP requests. Please try again in an hour.',
    code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
  },
});

// General API rate limit
export const apiRateLimit = rateLimit({
  windowMs: RATE_LIMITS.API_WINDOW_MINUTES * 60 * 1000,
  max: RATE_LIMITS.API_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Rate limit exceeded. Please slow down.',
    code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
  },
  skip: () => process.env.NODE_ENV === 'test',
});
