// ============================================================
// modules/auth/auth.controller.ts
// HTTP handlers — thin layer, delegates to auth.service.ts
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';
import {
  registerSchema,
  loginPasswordSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from './auth.validation';
import { sendSuccess, sendCreated } from '../../utils/responseHelpers';
import { JWT_CONFIG } from '@taxiflow/shared-constants';
import { createModuleLogger } from '../../config/logger';
import { env } from '../../config/env';

const logger = createModuleLogger('auth-controller');

// POST /auth/register
export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { body } = registerSchema.parse({ body: req.body });
    const user = await authService.registerUser({
      tenantId: req.tenantId,
      ...body,
      role: 'PASSENGER', // public registration always creates passengers
    });
    sendCreated(res, user, 'Registration successful. Please verify your phone number.');
  } catch (error) {
    next(error);
  }
}

// POST /auth/login
export async function loginWithPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { body } = loginPasswordSchema.parse({ body: req.body });
    const result = await authService.loginWithPassword(
      req.tenantId,
      body.email,
      body.password,
    );

    const { tokens, ...user } = result;

    // Store refresh token in httpOnly cookie
    res.cookie(JWT_CONFIG.REFRESH_TOKEN_COOKIE_NAME, tokens.accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    sendSuccess(res, { user, accessToken: tokens.accessToken, expiresIn: tokens.expiresIn });
  } catch (error) {
    next(error);
  }
}

// POST /auth/send-otp
export async function sendOtp(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { body } = sendOtpSchema.parse({ body: req.body });
    await authService.sendOtp(req.tenantId, body.phone);
    sendSuccess(res, null, 'OTP sent successfully');
  } catch (error) {
    next(error);
  }
}

// POST /auth/verify-otp
export async function verifyOtp(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { body } = verifyOtpSchema.parse({ body: req.body });
    const result = await authService.verifyOtp(
      req.tenantId,
      body.phone,
      body.code,
    );

    const { tokens, ...user } = result;

    res.cookie(JWT_CONFIG.REFRESH_TOKEN_COOKIE_NAME, tokens.accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, { user, accessToken: tokens.accessToken, expiresIn: tokens.expiresIn });
  } catch (error) {
    next(error);
  }
}

// POST /auth/refresh-token
export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Try cookie first, then body
    const token =
      (req.cookies as Record<string, string>)[JWT_CONFIG.REFRESH_TOKEN_COOKIE_NAME] ||
      (req.body as { refreshToken?: string }).refreshToken;

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

    res.cookie(JWT_CONFIG.REFRESH_TOKEN_COOKIE_NAME, tokens.accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn });
  } catch (error) {
    next(error);
  }
}

// POST /auth/logout
export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token =
      (req.cookies as Record<string, string>)[JWT_CONFIG.REFRESH_TOKEN_COOKIE_NAME] ||
      (req.body as { refreshToken?: string }).refreshToken;

    if (token) {
      await authService.logout(token);
    }

    res.clearCookie(JWT_CONFIG.REFRESH_TOKEN_COOKIE_NAME);
    sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
}

// POST /auth/logout-all
export async function logoutAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await authService.logoutAllDevices(req.user.id);
    res.clearCookie(JWT_CONFIG.REFRESH_TOKEN_COOKIE_NAME);
    sendSuccess(res, null, 'All sessions terminated');
  } catch (error) {
    next(error);
  }
}

// GET /auth/me
export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendSuccess(res, req.user);
  } catch (error) {
    next(error);
  }
}
