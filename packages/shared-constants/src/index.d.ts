export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly SERVICE_UNAVAILABLE: 503;
};
export declare const ERROR_CODES: {
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly TOKEN_INVALID: "TOKEN_INVALID";
    readonly OTP_INVALID: "OTP_INVALID";
    readonly OTP_EXPIRED: "OTP_EXPIRED";
    readonly OTP_MAX_ATTEMPTS: "OTP_MAX_ATTEMPTS";
    readonly EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS";
    readonly PHONE_ALREADY_EXISTS: "PHONE_ALREADY_EXISTS";
    readonly ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED";
    readonly ACCOUNT_NOT_VERIFIED: "ACCOUNT_NOT_VERIFIED";
    readonly TENANT_NOT_FOUND: "TENANT_NOT_FOUND";
    readonly TENANT_SUSPENDED: "TENANT_SUSPENDED";
    readonly TENANT_INVALID: "TENANT_INVALID";
    readonly BOOKING_NOT_FOUND: "BOOKING_NOT_FOUND";
    readonly BOOKING_CANNOT_CANCEL: "BOOKING_CANNOT_CANCEL";
    readonly BOOKING_ALREADY_ASSIGNED: "BOOKING_ALREADY_ASSIGNED";
    readonly NO_DRIVERS_AVAILABLE: "NO_DRIVERS_AVAILABLE";
    readonly DRIVER_NOT_FOUND: "DRIVER_NOT_FOUND";
    readonly DRIVER_NOT_APPROVED: "DRIVER_NOT_APPROVED";
    readonly DRIVER_ALREADY_ON_TRIP: "DRIVER_ALREADY_ON_TRIP";
    readonly DRIVER_OFFLINE: "DRIVER_OFFLINE";
    readonly PAYMENT_FAILED: "PAYMENT_FAILED";
    readonly PAYMENT_NOT_FOUND: "PAYMENT_NOT_FOUND";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED";
    readonly SUBSCRIPTION_INACTIVE: "SUBSCRIPTION_INACTIVE";
    readonly DRIVER_LIMIT_REACHED: "DRIVER_LIMIT_REACHED";
};
export declare const JWT_CONFIG: {
    readonly ACCESS_TOKEN_EXPIRY: "15m";
    readonly REFRESH_TOKEN_EXPIRY: "30d";
    readonly REFRESH_TOKEN_COOKIE_NAME: "taxiflow_refresh_token";
};
export declare const OTP_CONFIG: {
    readonly LENGTH: 6;
    readonly EXPIRY_MINUTES: 5;
    readonly MAX_ATTEMPTS: 3;
    readonly RESEND_COOLDOWN_SECONDS: 60;
};
export declare const BCRYPT_ROUNDS: 12;
export declare const BOOKING_CONFIG: {
    readonly DRIVER_ACCEPT_TIMEOUT_SECONDS: 30;
    readonly MAX_SEARCH_RADIUS_KM: 10;
    readonly MAX_DRIVER_SEARCH_ATTEMPTS: 3;
    readonly FREE_CANCEL_WINDOW_MINUTES: 5;
};
export declare const PAGINATION: {
    readonly DEFAULT_PAGE: 1;
    readonly DEFAULT_LIMIT: 20;
    readonly MAX_LIMIT: 100;
};
export declare const RATE_LIMITS: {
    readonly AUTH_MAX_REQUESTS: 10;
    readonly AUTH_WINDOW_MINUTES: 15;
    readonly API_MAX_REQUESTS: 100;
    readonly API_WINDOW_MINUTES: 1;
    readonly OTP_MAX_REQUESTS: 5;
    readonly OTP_WINDOW_MINUTES: 60;
};
export declare const SOCKET_EVENTS: {
    readonly BOOKING_NEW: "booking:new";
    readonly BOOKING_UPDATED: "booking:updated";
    readonly BOOKING_ACCEPTED: "booking:accepted";
    readonly BOOKING_CANCELLED: "booking:cancelled";
    readonly RIDE_STARTED: "ride:started";
    readonly RIDE_COMPLETED: "ride:completed";
    readonly DRIVER_LOCATION: "driver:location";
    readonly DRIVER_STATUS_CHANGED: "driver:statusChanged";
    readonly DRIVER_LOCATION_UPDATE: "driver:locationUpdate";
    readonly JOIN_BOOKING_ROOM: "booking:join";
    readonly LEAVE_BOOKING_ROOM: "booking:leave";
    readonly CONNECT: "connect";
    readonly DISCONNECT: "disconnect";
    readonly ERROR: "error";
};
export declare const SOCKET_ROOMS: {
    readonly booking: (bookingId: string) => string;
    readonly tenant: (tenantId: string) => string;
    readonly driver: (driverId: string) => string;
    readonly passenger: (passengerId: string) => string;
    readonly dispatcher: (tenantId: string) => string;
};
export declare const CACHE_KEYS: {
    readonly tenant: (tenantId: string) => string;
    readonly tenantSettings: (tenantId: string) => string;
    readonly tenantApiKeys: (tenantId: string) => string;
    readonly driverLocation: (driverId: string) => string;
    readonly onlineDrivers: (tenantId: string) => string;
    readonly otpCode: (phone: string) => string;
    readonly otpAttempts: (phone: string) => string;
    readonly fareEstimate: (hash: string) => string;
    readonly surgeMultiplier: (tenantId: string, zoneId: string) => string;
    readonly rateLimitAuth: (ip: string) => string;
};
export declare const CACHE_TTL: {
    readonly TENANT: 3600;
    readonly TENANT_SETTINGS: 3600;
    readonly TENANT_API_KEYS: 3600;
    readonly DRIVER_LOCATION: 30;
    readonly ONLINE_DRIVERS: 60;
    readonly FARE_ESTIMATE: 300;
    readonly SURGE_MULTIPLIER: 120;
};
export declare const SUBSCRIPTION_PLANS: {
    readonly STARTER: {
        readonly slug: "starter";
        readonly name: "Starter";
        readonly priceMonthly: 99;
        readonly maxDrivers: 15;
        readonly currency: "GBP";
    };
    readonly BUSINESS: {
        readonly slug: "business";
        readonly name: "Business";
        readonly priceMonthly: 199;
        readonly maxDrivers: 50;
        readonly currency: "GBP";
    };
    readonly PRO: {
        readonly slug: "pro";
        readonly name: "Pro";
        readonly priceMonthly: 349;
        readonly maxDrivers: 150;
        readonly currency: "GBP";
    };
    readonly ENTERPRISE: {
        readonly slug: "enterprise";
        readonly name: "Enterprise";
        readonly priceMonthly: 599;
        readonly maxDrivers: null;
        readonly currency: "GBP";
    };
};
export declare const VEHICLE_TYPES: readonly ["STANDARD", "EXECUTIVE", "MPV", "WAV"];
export declare const SUPPORTED_CURRENCIES: readonly ["GBP", "USD", "EUR", "AED", "SAR", "PKR", "INR", "AUD", "CAD", "ZAR"];
export declare const SUPPORTED_LOCALES: readonly ["en", "ar", "fr", "ur"];
export declare const UPLOAD_CONFIG: {
    readonly MAX_FILE_SIZE_MB: 10;
    readonly ALLOWED_IMAGE_TYPES: readonly ["image/jpeg", "image/png", "image/webp"];
    readonly ALLOWED_DOC_TYPES: readonly ["application/pdf", "image/jpeg", "image/png"];
};
export declare const DRIVER_SEARCH: {
    readonly DEFAULT_RADIUS_KM: 5;
    readonly MAX_RADIUS_KM: 15;
    readonly GPS_UPDATE_INTERVAL_MS: 5000;
};
export declare const ENCRYPTION: {
    readonly ALGORITHM: "aes-256-gcm";
    readonly KEY_LENGTH: 32;
    readonly IV_LENGTH: 16;
    readonly AUTH_TAG_LENGTH: 16;
};
export declare const HEADERS: {
    readonly TENANT_ID: "x-tenant-id";
    readonly REQUEST_ID: "x-request-id";
    readonly API_VERSION: "x-api-version";
};
export declare const API_VERSION: "v1";
export declare const API_PREFIX: "/api/v1";
//# sourceMappingURL=index.d.ts.map