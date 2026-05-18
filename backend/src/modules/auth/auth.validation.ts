// ============================================================
// modules/auth/auth.validation.ts
// Zod schemas — agent.md: validate input on EVERY endpoint
// ============================================================

import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    phone: z
      .string()
      .min(7, 'Phone number too short')
      .max(20, 'Phone number too long')
      .regex(/^\+?[0-9\s\-().]+$/, 'Invalid phone number format'),
    email: z.string().email('Invalid email address').optional(),
    firstName: z.string().min(1, 'First name required').max(50),
    lastName: z.string().min(1, 'Last name required').max(50),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .optional(),
  }),
});

export const loginPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const sendOtpSchema = z.object({
  body: z.object({
    phone: z
      .string()
      .min(7)
      .max(20)
      .regex(/^\+?[0-9\s\-().]+$/, 'Invalid phone number'),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: z
      .string()
      .min(7)
      .max(20)
      .regex(/^\+?[0-9\s\-().]+$/, 'Invalid phone number'),
    code: z
      .string()
      .length(6, 'OTP must be 6 digits')
      .regex(/^\d{6}$/, 'OTP must be numeric'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required').optional(),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginPasswordInput = z.infer<typeof loginPasswordSchema>['body'];
export type SendOtpInput = z.infer<typeof sendOtpSchema>['body'];
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>['body'];
