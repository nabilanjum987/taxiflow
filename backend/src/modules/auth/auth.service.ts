// ============================================================
// modules/auth/auth.service.ts
// Business logic for authentication
// agent.md: JWT 15min, refresh 30d, bcrypt rounds 12, OTP 6 digits
// ============================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { redis, cacheGet, cacheSet, cacheDel } from '../../config/redis';
import { env } from '../../config/env';
import { createModuleLogger } from '../../config/logger';
import {
  JWT_CONFIG,
  OTP_CONFIG,
  BCRYPT_ROUNDS,
  ERROR_CODES,
  HTTP_STATUS,
  CACHE_KEYS,
} from '@taxiflow/shared-constants';
import { generateOtpCode, addMinutes } from '@taxiflow/shared-utils';
import type { UserRole, AuthTokens, AuthUser } from '@taxiflow/shared-types';
import { ApiError } from '../../utils/ApiError';
import { addSmsJob } from '../../jobs/queues';
import type { JwtPayload } from '../../middleware/authMiddleware';

const logger = createModuleLogger('auth-service');

// ─── REGISTER ─────────────────────────────────────────────

interface RegisterInput {
  tenantId: string;
  phone: string;
  email?: string;
  firstName: string;
  lastName: string;
  password?: string;
  role: UserRole;
}

export async function registerUser(input: RegisterInput): Promise<AuthUser> {
  const { tenantId, phone, email, firstName, lastName, password, role } = input;

  // Check phone uniqueness within tenant
  const existingPhone = await prisma.user.findUnique({
    where: { tenantId_phone: { tenantId, phone } },
  });
  if (existingPhone) {
    throw new ApiError(
      'Phone number already registered',
      HTTP_STATUS.CONFLICT,
      ERROR_CODES.PHONE_ALREADY_EXISTS,
    );
  }

  // Check email uniqueness within tenant
  if (email) {
    const existingEmail = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
    if (existingEmail) {
      throw new ApiError(
        'Email already registered',
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.EMAIL_ALREADY_EXISTS,
      );
    }
  }

  // Hash password if provided
  let passwordHash: string | undefined;
  if (password) {
    passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  // Create user
  const user = await prisma.user.create({
    data: {
      id: uuidv4(),
      tenantId,
      phone,
      email: email ?? null,
      firstName,
      lastName,
      role,
      status: 'PENDING',
      passwordHash: passwordHash ?? null,
    },
    select: {
      id: true,
      tenantId: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      avatarUrl: true,
    },
  });

  // Create associated profile based on role
  if (role === 'PASSENGER') {
    await prisma.passenger.create({
      data: {
        id: uuidv4(),
        tenantId,
        userId: user.id,
      },
    });
  }

  logger.info('User registered', { userId: user.id, tenantId, role });
  return user as unknown as AuthUser;
}

// ─── SEND OTP ─────────────────────────────────────────────

export async function sendOtp(tenantId: string, phone: string): Promise<void> {
  // Check rate limiting via Redis
  const attemptsKey = CACHE_KEYS.otpAttempts(phone);
  const attempts = await cacheGet<number>(attemptsKey);

  if (attempts && attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
    throw new ApiError(
      'Too many OTP requests. Please wait before requesting again.',
      HTTP_STATUS.TOO_MANY_REQUESTS,
      ERROR_CODES.OTP_MAX_ATTEMPTS,
    );
  }

  const code = generateOtpCode(OTP_CONFIG.LENGTH);
  const expiresAt = addMinutes(new Date(), OTP_CONFIG.EXPIRY_MINUTES);

  // Upsert OTP in database
  await prisma.otpCode.upsert({
    where: { tenantId_phone: { tenantId, phone } },
    create: {
      id: uuidv4(),
      tenantId,
      phone,
      code,
      attempts: 0,
      expiresAt,
    },
    update: {
      code,
      attempts: 0,
      expiresAt,
      verifiedAt: null,
    },
  });

  // Increment rate limit counter
  const newAttempts = (attempts ?? 0) + 1;
  await cacheSet(attemptsKey, newAttempts, OTP_CONFIG.RESEND_COOLDOWN_SECONDS);

  await addSmsJob({
    tenantId,
    to: phone,
    message: `Your verification code is ${code}. It expires in ${OTP_CONFIG.EXPIRY_MINUTES} minutes.`,
  });

  if (env.NODE_ENV === 'development') {
    logger.info(`OTP for ${phone}: ${code}`, { tenantId });
  }

  logger.info('OTP queued for SMS', { phone: phone.slice(0, 5) + '***', tenantId });
}

// ─── VERIFY OTP ───────────────────────────────────────────

export async function verifyOtp(
  tenantId: string,
  phone: string,
  code: string,
): Promise<AuthUser & { tokens: AuthTokens }> {
  const otpRecord = await prisma.otpCode.findUnique({
    where: { tenantId_phone: { tenantId, phone } },
  });

  if (!otpRecord) {
    throw new ApiError('OTP not found. Please request a new one.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.OTP_INVALID);
  }

  if (otpRecord.verifiedAt) {
    throw new ApiError('OTP already used.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.OTP_INVALID);
  }

  if (new Date() > otpRecord.expiresAt) {
    throw new ApiError('OTP has expired. Please request a new one.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.OTP_EXPIRED);
  }

  if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
    throw new ApiError('Too many incorrect attempts. Please request a new OTP.', HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_CODES.OTP_MAX_ATTEMPTS);
  }

  if (otpRecord.code !== code) {
    // Increment attempts
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });
    throw new ApiError('Invalid OTP code.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.OTP_INVALID);
  }

  // Mark OTP as verified
  await prisma.otpCode.update({
    where: { id: otpRecord.id },
    data: { verifiedAt: new Date() },
  });

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { tenantId_phone: { tenantId, phone } },
  });

  if (!user) {
    // Auto-create passenger user on first OTP verification
    const newUser = await registerUser({
      tenantId,
      phone,
      role: 'PASSENGER',
      firstName: 'New',
      lastName: 'User',
    });
    user = await prisma.user.findUnique({ where: { id: newUser.id } });
  }

  if (!user) {
    throw new ApiError('User not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  // Activate user
  if (user.status === 'PENDING') {
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'ACTIVE', phoneVerified: true, lastLoginAt: new Date() },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  const tokens = await generateTokens(user.id, tenantId, user.role as UserRole);

  logger.info('OTP verified — user logged in', { userId: user.id, tenantId });

  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role as UserRole,
    status: user.status as AuthUser['status'],
    avatarUrl: user.avatarUrl,
    tokens,
  };
}

// ─── EMAIL + PASSWORD LOGIN ────────────────────────────────

export async function loginWithPassword(
  tenantId: string,
  email: string,
  password: string,
): Promise<AuthUser & { tokens: AuthTokens }> {
  const user = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });

  if (!user || !user.passwordHash) {
    throw new ApiError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS);
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new ApiError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (user.status === 'SUSPENDED') {
    throw new ApiError('Your account has been suspended', HTTP_STATUS.FORBIDDEN, ERROR_CODES.ACCOUNT_SUSPENDED);
  }

  if (user.status === 'PENDING') {
    throw new ApiError('Please verify your account first', HTTP_STATUS.FORBIDDEN, ERROR_CODES.ACCOUNT_NOT_VERIFIED);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = await generateTokens(user.id, tenantId, user.role as UserRole);

  logger.info('User logged in with password', { userId: user.id, tenantId });

  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role as UserRole,
    status: user.status as AuthUser['status'],
    avatarUrl: user.avatarUrl,
    tokens,
  };
}

// ─── REFRESH TOKEN ────────────────────────────────────────

export async function refreshAccessToken(
  refreshToken: string,
): Promise<AuthTokens> {
  // Verify refresh token JWT
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;
  } catch {
    throw new ApiError('Invalid or expired refresh token', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
  }

  // Check token exists in DB (not revoked)
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (!storedToken || new Date() > storedToken.expiresAt) {
    throw new ApiError('Refresh token expired. Please log in again.', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_EXPIRED);
  }

  // Get current user
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, tenantId: true, role: true, status: true },
  });

  if (!user || user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
    throw new ApiError('Account not accessible', HTTP_STATUS.FORBIDDEN, ERROR_CODES.ACCOUNT_SUSPENDED);
  }

  // Delete old refresh token (rotation)
  await prisma.refreshToken.delete({ where: { id: storedToken.id } });

  // Generate new token pair
  return generateTokens(user.id, user.tenantId, user.role as UserRole);
}

// ─── LOGOUT ───────────────────────────────────────────────

export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { token: refreshToken },
  });
}

export async function logoutAllDevices(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
  logger.info('All sessions revoked', { userId });
}

// ─── TOKEN GENERATION ─────────────────────────────────────

async function generateTokens(
  userId: string,
  tenantId: string,
  role: UserRole,
): Promise<AuthTokens> {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = { userId, tenantId, role };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY,
  });

  // Store refresh token in DB
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: {
      id: uuidv4(),
      userId,
      token: refreshToken,
      expiresAt,
    },
  });

  return {
    accessToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}
