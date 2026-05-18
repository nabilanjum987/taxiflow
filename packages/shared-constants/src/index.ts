// ============================================================
// @taxiflow/shared-constants
// All constants, enums, and magic values — used everywhere
// ============================================================

// ─── HTTP STATUS CODES ────────────────────────────────────

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ─── ERROR CODES ──────────────────────────────────────────

export const ERROR_CODES = {
  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  PHONE_ALREADY_EXISTS: 'PHONE_ALREADY_EXISTS',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_NOT_VERIFIED: 'ACCOUNT_NOT_VERIFIED',
  // Tenant
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  TENANT_SUSPENDED: 'TENANT_SUSPENDED',
  TENANT_INVALID: 'TENANT_INVALID',
  // Booking
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  BOOKING_CANNOT_CANCEL: 'BOOKING_CANNOT_CANCEL',
  BOOKING_ALREADY_ASSIGNED: 'BOOKING_ALREADY_ASSIGNED',
  NO_DRIVERS_AVAILABLE: 'NO_DRIVERS_AVAILABLE',
  // Driver
  DRIVER_NOT_FOUND: 'DRIVER_NOT_FOUND',
  DRIVER_NOT_APPROVED: 'DRIVER_NOT_APPROVED',
  DRIVER_ALREADY_ON_TRIP: 'DRIVER_ALREADY_ON_TRIP',
  DRIVER_OFFLINE: 'DRIVER_OFFLINE',
  // Payment
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  // General
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  // Subscription
  SUBSCRIPTION_INACTIVE: 'SUBSCRIPTION_INACTIVE',
  DRIVER_LIMIT_REACHED: 'DRIVER_LIMIT_REACHED',
} as const;

// ─── JWT ──────────────────────────────────────────────────

export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '30d',
  REFRESH_TOKEN_COOKIE_NAME: 'taxiflow_refresh_token',
} as const;

// ─── OTP ──────────────────────────────────────────────────

export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 3,
  RESEND_COOLDOWN_SECONDS: 60,
} as const;

// ─── BCRYPT ───────────────────────────────────────────────

export const BCRYPT_ROUNDS = 12 as const;

// ─── BOOKING ──────────────────────────────────────────────

export const BOOKING_CONFIG = {
  DRIVER_ACCEPT_TIMEOUT_SECONDS: 30,
  MAX_SEARCH_RADIUS_KM: 10,
  MAX_DRIVER_SEARCH_ATTEMPTS: 3,
  // Cancellation allowed within X minutes of booking
  FREE_CANCEL_WINDOW_MINUTES: 5,
} as const;

// ─── PAGINATION ───────────────────────────────────────────

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ─── RATE LIMITING ────────────────────────────────────────

export const RATE_LIMITS = {
  // Per IP
  AUTH_MAX_REQUESTS: 10,
  AUTH_WINDOW_MINUTES: 15,
  // Per user
  API_MAX_REQUESTS: 100,
  API_WINDOW_MINUTES: 1,
  // OTP
  OTP_MAX_REQUESTS: 5,
  OTP_WINDOW_MINUTES: 60,
} as const;

// ─── SOCKET EVENTS ────────────────────────────────────────

export const SOCKET_EVENTS = {
  // Server → Client (booking updates)
  BOOKING_NEW: 'booking:new',
  BOOKING_UPDATED: 'booking:updated',
  BOOKING_ACCEPTED: 'booking:accepted',
  BOOKING_CANCELLED: 'booking:cancelled',
  RIDE_STARTED: 'ride:started',
  RIDE_COMPLETED: 'ride:completed',
  // Server → Client (driver updates)
  DRIVER_LOCATION: 'driver:location',
  DRIVER_STATUS_CHANGED: 'driver:statusChanged',
  // Client → Server
  DRIVER_LOCATION_UPDATE: 'driver:locationUpdate',
  JOIN_BOOKING_ROOM: 'booking:join',
  LEAVE_BOOKING_ROOM: 'booking:leave',
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
} as const;

// ─── SOCKET ROOMS ─────────────────────────────────────────

export const SOCKET_ROOMS = {
  booking: (bookingId: string): string => `booking:${bookingId}`,
  tenant: (tenantId: string): string => `tenant:${tenantId}`,
  driver: (driverId: string): string => `driver:${driverId}`,
  passenger: (passengerId: string): string => `passenger:${passengerId}`,
  dispatcher: (tenantId: string): string => `dispatcher:${tenantId}`,
} as const;

// ─── CACHE KEYS ───────────────────────────────────────────

export const CACHE_KEYS = {
  tenant: (tenantId: string): string => `tenant:${tenantId}`,
  tenantSettings: (tenantId: string): string => `tenant:settings:${tenantId}`,
  tenantApiKeys: (tenantId: string): string => `tenant:apikeys:${tenantId}`,
  driverLocation: (driverId: string): string => `driver:location:${driverId}`,
  onlineDrivers: (tenantId: string): string => `drivers:online:${tenantId}`,
  otpCode: (phone: string): string => `otp:${phone}`,
  otpAttempts: (phone: string): string => `otp:attempts:${phone}`,
  fareEstimate: (hash: string): string => `fare:estimate:${hash}`,
  surgeMultiplier: (tenantId: string, zoneId: string): string =>
    `surge:${tenantId}:${zoneId}`,
  rateLimitAuth: (ip: string): string => `ratelimit:auth:${ip}`,
} as const;

// ─── CACHE TTL (seconds) ──────────────────────────────────

export const CACHE_TTL = {
  TENANT: 3600, // 1 hour
  TENANT_SETTINGS: 3600,
  TENANT_API_KEYS: 3600,
  DRIVER_LOCATION: 30, // 30 seconds — GPS is fresh
  ONLINE_DRIVERS: 60, // 1 minute
  FARE_ESTIMATE: 300, // 5 minutes
  SURGE_MULTIPLIER: 120, // 2 minutes
} as const;

// ─── SUBSCRIPTION PLANS ───────────────────────────────────

export const SUBSCRIPTION_PLANS = {
  STARTER: {
    slug: 'starter',
    name: 'Starter',
    priceMonthly: 99,
    maxDrivers: 15,
    currency: 'GBP',
  },
  BUSINESS: {
    slug: 'business',
    name: 'Business',
    priceMonthly: 199,
    maxDrivers: 50,
    currency: 'GBP',
  },
  PRO: {
    slug: 'pro',
    name: 'Pro',
    priceMonthly: 349,
    maxDrivers: 150,
    currency: 'GBP',
  },
  ENTERPRISE: {
    slug: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 599,
    maxDrivers: null, // unlimited
    currency: 'GBP',
  },
} as const;

// ─── VEHICLE TYPES ────────────────────────────────────────

export const VEHICLE_TYPES = ['STANDARD', 'EXECUTIVE', 'MPV', 'WAV'] as const;

// ─── SUPPORTED CURRENCIES ─────────────────────────────────

export const SUPPORTED_CURRENCIES = [
  'GBP',
  'USD',
  'EUR',
  'AED',
  'SAR',
  'PKR',
  'INR',
  'AUD',
  'CAD',
  'ZAR',
] as const;

// ─── SUPPORTED LOCALES ────────────────────────────────────

export const SUPPORTED_LOCALES = ['en', 'ar', 'fr', 'ur'] as const;

// ─── UPLOAD LIMITS ────────────────────────────────────────

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOC_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
} as const;

// ─── DRIVER SEARCH ────────────────────────────────────────

export const DRIVER_SEARCH = {
  DEFAULT_RADIUS_KM: 5,
  MAX_RADIUS_KM: 15,
  GPS_UPDATE_INTERVAL_MS: 5000,
} as const;

// ─── ENCRYPTION ───────────────────────────────────────────

export const ENCRYPTION = {
  ALGORITHM: 'aes-256-gcm',
  KEY_LENGTH: 32,
  IV_LENGTH: 16,
  AUTH_TAG_LENGTH: 16,
} as const;

// ─── HEADERS ──────────────────────────────────────────────

export const HEADERS = {
  TENANT_ID: 'x-tenant-id',
  REQUEST_ID: 'x-request-id',
  API_VERSION: 'x-api-version',
} as const;

// ─── API VERSION ──────────────────────────────────────────

export const API_VERSION = 'v1' as const;
export const API_PREFIX = `/api/${API_VERSION}` as const;
