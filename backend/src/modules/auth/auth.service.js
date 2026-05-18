"use strict";
// ============================================================
// modules/auth/auth.service.ts
// Business logic for authentication
// agent.md: JWT 15min, refresh 30d, bcrypt rounds 12, OTP 6 digits
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.sendOtp = sendOtp;
exports.verifyOtp = verifyOtp;
exports.loginWithPassword = loginWithPassword;
exports.refreshAccessToken = refreshAccessToken;
exports.logout = logout;
exports.logoutAllDevices = logoutAllDevices;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const database_1 = require("../../config/database");
const redis_1 = require("../../config/redis");
const env_1 = require("../../config/env");
const logger_1 = require("../../config/logger");
const shared_constants_1 = require("@taxiflow/shared-constants");
const shared_utils_1 = require("@taxiflow/shared-utils");
const ApiError_1 = require("../../utils/ApiError");
const queues_1 = require("../../jobs/queues");
const logger = (0, logger_1.createModuleLogger)('auth-service');
async function registerUser(input) {
    const { tenantId, phone, email, firstName, lastName, password, role } = input;
    // Check phone uniqueness within tenant
    const existingPhone = await database_1.prisma.user.findUnique({
        where: { tenantId_phone: { tenantId, phone } },
    });
    if (existingPhone) {
        throw new ApiError_1.ApiError('Phone number already registered', shared_constants_1.HTTP_STATUS.CONFLICT, shared_constants_1.ERROR_CODES.PHONE_ALREADY_EXISTS);
    }
    // Check email uniqueness within tenant
    if (email) {
        const existingEmail = await database_1.prisma.user.findUnique({
            where: { tenantId_email: { tenantId, email } },
        });
        if (existingEmail) {
            throw new ApiError_1.ApiError('Email already registered', shared_constants_1.HTTP_STATUS.CONFLICT, shared_constants_1.ERROR_CODES.EMAIL_ALREADY_EXISTS);
        }
    }
    // Hash password if provided
    let passwordHash;
    if (password) {
        passwordHash = await bcryptjs_1.default.hash(password, shared_constants_1.BCRYPT_ROUNDS);
    }
    // Create user
    const user = await database_1.prisma.user.create({
        data: {
            id: (0, uuid_1.v4)(),
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
        await database_1.prisma.passenger.create({
            data: {
                id: (0, uuid_1.v4)(),
                tenantId,
                userId: user.id,
            },
        });
    }
    logger.info('User registered', { userId: user.id, tenantId, role });
    return user;
}
// ─── SEND OTP ─────────────────────────────────────────────
async function sendOtp(tenantId, phone) {
    // Check rate limiting via Redis
    const attemptsKey = shared_constants_1.CACHE_KEYS.otpAttempts(phone);
    const attempts = await (0, redis_1.cacheGet)(attemptsKey);
    if (attempts && attempts >= shared_constants_1.OTP_CONFIG.MAX_ATTEMPTS) {
        throw new ApiError_1.ApiError('Too many OTP requests. Please wait before requesting again.', shared_constants_1.HTTP_STATUS.TOO_MANY_REQUESTS, shared_constants_1.ERROR_CODES.OTP_MAX_ATTEMPTS);
    }
    const code = (0, shared_utils_1.generateOtpCode)(shared_constants_1.OTP_CONFIG.LENGTH);
    const expiresAt = (0, shared_utils_1.addMinutes)(new Date(), shared_constants_1.OTP_CONFIG.EXPIRY_MINUTES);
    // Upsert OTP in database
    await database_1.prisma.otpCode.upsert({
        where: { tenantId_phone: { tenantId, phone } },
        create: {
            id: (0, uuid_1.v4)(),
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
    await (0, redis_1.cacheSet)(attemptsKey, newAttempts, shared_constants_1.OTP_CONFIG.RESEND_COOLDOWN_SECONDS);
    await (0, queues_1.addSmsJob)({
        tenantId,
        to: phone,
        message: `Your verification code is ${code}. It expires in ${shared_constants_1.OTP_CONFIG.EXPIRY_MINUTES} minutes.`,
    });
    if (env_1.env.NODE_ENV === 'development') {
        logger.info(`OTP for ${phone}: ${code}`, { tenantId });
    }
    logger.info('OTP queued for SMS', { phone: phone.slice(0, 5) + '***', tenantId });
}
// ─── VERIFY OTP ───────────────────────────────────────────
async function verifyOtp(tenantId, phone, code) {
    const otpRecord = await database_1.prisma.otpCode.findUnique({
        where: { tenantId_phone: { tenantId, phone } },
    });
    if (!otpRecord) {
        throw new ApiError_1.ApiError('OTP not found. Please request a new one.', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.OTP_INVALID);
    }
    if (otpRecord.verifiedAt) {
        throw new ApiError_1.ApiError('OTP already used.', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.OTP_INVALID);
    }
    if (new Date() > otpRecord.expiresAt) {
        throw new ApiError_1.ApiError('OTP has expired. Please request a new one.', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.OTP_EXPIRED);
    }
    if (otpRecord.attempts >= shared_constants_1.OTP_CONFIG.MAX_ATTEMPTS) {
        throw new ApiError_1.ApiError('Too many incorrect attempts. Please request a new OTP.', shared_constants_1.HTTP_STATUS.TOO_MANY_REQUESTS, shared_constants_1.ERROR_CODES.OTP_MAX_ATTEMPTS);
    }
    if (otpRecord.code !== code) {
        // Increment attempts
        await database_1.prisma.otpCode.update({
            where: { id: otpRecord.id },
            data: { attempts: { increment: 1 } },
        });
        throw new ApiError_1.ApiError('Invalid OTP code.', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.OTP_INVALID);
    }
    // Mark OTP as verified
    await database_1.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { verifiedAt: new Date() },
    });
    // Find or create user
    let user = await database_1.prisma.user.findUnique({
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
        user = await database_1.prisma.user.findUnique({ where: { id: newUser.id } });
    }
    if (!user) {
        throw new ApiError_1.ApiError('User not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.NOT_FOUND);
    }
    // Activate user
    if (user.status === 'PENDING') {
        await database_1.prisma.user.update({
            where: { id: user.id },
            data: { status: 'ACTIVE', phoneVerified: true, lastLoginAt: new Date() },
        });
    }
    else {
        await database_1.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
    }
    const tokens = await generateTokens(user.id, tenantId, user.role);
    logger.info('OTP verified — user logged in', { userId: user.id, tenantId });
    return {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
        tokens,
    };
}
// ─── EMAIL + PASSWORD LOGIN ────────────────────────────────
async function loginWithPassword(tenantId, email, password) {
    const user = await database_1.prisma.user.findUnique({
        where: { tenantId_email: { tenantId, email } },
    });
    if (!user || !user.passwordHash) {
        throw new ApiError_1.ApiError('Invalid email or password', shared_constants_1.HTTP_STATUS.UNAUTHORIZED, shared_constants_1.ERROR_CODES.INVALID_CREDENTIALS);
    }
    const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        throw new ApiError_1.ApiError('Invalid email or password', shared_constants_1.HTTP_STATUS.UNAUTHORIZED, shared_constants_1.ERROR_CODES.INVALID_CREDENTIALS);
    }
    if (user.status === 'SUSPENDED') {
        throw new ApiError_1.ApiError('Your account has been suspended', shared_constants_1.HTTP_STATUS.FORBIDDEN, shared_constants_1.ERROR_CODES.ACCOUNT_SUSPENDED);
    }
    if (user.status === 'PENDING') {
        throw new ApiError_1.ApiError('Please verify your account first', shared_constants_1.HTTP_STATUS.FORBIDDEN, shared_constants_1.ERROR_CODES.ACCOUNT_NOT_VERIFIED);
    }
    await database_1.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    });
    const tokens = await generateTokens(user.id, tenantId, user.role);
    logger.info('User logged in with password', { userId: user.id, tenantId });
    return {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
        tokens,
    };
}
// ─── REFRESH TOKEN ────────────────────────────────────────
async function refreshAccessToken(refreshToken) {
    // Verify refresh token JWT
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(refreshToken, env_1.env.JWT_REFRESH_SECRET);
    }
    catch {
        throw new ApiError_1.ApiError('Invalid or expired refresh token', shared_constants_1.HTTP_STATUS.UNAUTHORIZED, shared_constants_1.ERROR_CODES.TOKEN_INVALID);
    }
    // Check token exists in DB (not revoked)
    const storedToken = await database_1.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
    });
    if (!storedToken || new Date() > storedToken.expiresAt) {
        throw new ApiError_1.ApiError('Refresh token expired. Please log in again.', shared_constants_1.HTTP_STATUS.UNAUTHORIZED, shared_constants_1.ERROR_CODES.TOKEN_EXPIRED);
    }
    // Get current user
    const user = await database_1.prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, tenantId: true, role: true, status: true },
    });
    if (!user || user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
        throw new ApiError_1.ApiError('Account not accessible', shared_constants_1.HTTP_STATUS.FORBIDDEN, shared_constants_1.ERROR_CODES.ACCOUNT_SUSPENDED);
    }
    // Delete old refresh token (rotation)
    await database_1.prisma.refreshToken.delete({ where: { id: storedToken.id } });
    // Generate new token pair
    return generateTokens(user.id, user.tenantId, user.role);
}
// ─── LOGOUT ───────────────────────────────────────────────
async function logout(refreshToken) {
    await database_1.prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
    });
}
async function logoutAllDevices(userId) {
    await database_1.prisma.refreshToken.deleteMany({ where: { userId } });
    logger.info('All sessions revoked', { userId });
}
// ─── TOKEN GENERATION ─────────────────────────────────────
async function generateTokens(userId, tenantId, role) {
    const payload = { userId, tenantId, role };
    const accessToken = jsonwebtoken_1.default.sign(payload, env_1.env.JWT_ACCESS_SECRET, {
        expiresIn: shared_constants_1.JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
    });
    const refreshToken = jsonwebtoken_1.default.sign(payload, env_1.env.JWT_REFRESH_SECRET, {
        expiresIn: shared_constants_1.JWT_CONFIG.REFRESH_TOKEN_EXPIRY,
    });
    // Store refresh token in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await database_1.prisma.refreshToken.create({
        data: {
            id: (0, uuid_1.v4)(),
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
//# sourceMappingURL=auth.service.js.map