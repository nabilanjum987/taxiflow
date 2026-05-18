"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
// ============================================================
// config/env.ts — Environment variable loader & validator
// Throws on startup if required vars are missing
// ============================================================
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    // App
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.string().default('3000').transform(Number),
    APP_URL: zod_1.z.string().url(),
    FRONTEND_URL: zod_1.z.string().url().optional(),
    // Database
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    // Redis
    REDIS_URL: zod_1.z.string().min(1, 'REDIS_URL is required'),
    // JWT
    JWT_ACCESS_SECRET: zod_1.z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
    JWT_ACCESS_EXPIRY: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRY: zod_1.z.string().default('30d'),
    // Encryption (for client API keys)
    ENCRYPTION_KEY: zod_1.z.string().min(32, 'ENCRYPTION_KEY must be at least 32 chars'),
    // Our keys (optional in dev, required in prod)
    GOOGLE_MAPS_API_KEY: zod_1.z.string().optional(),
    SENDGRID_API_KEY: zod_1.z.string().optional(),
    AWS_ACCESS_KEY_ID: zod_1.z.string().optional(),
    AWS_SECRET_ACCESS_KEY: zod_1.z.string().optional(),
    AWS_S3_BUCKET: zod_1.z.string().optional(),
    AWS_S3_REGION: zod_1.z.string().default('eu-west-2'),
    FIREBASE_SERVICE_ACCOUNT_JSON: zod_1.z.string().optional(),
    // Stripe
    STRIPE_SECRET_KEY: zod_1.z.string().optional(),
    STRIPE_PUBLISHABLE_KEY: zod_1.z.string().optional(),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string().optional(),
    // Email
    EMAIL_FROM: zod_1.z.string().email().default('noreply@taxiflow.com'),
    EMAIL_FROM_NAME: zod_1.z.string().default('TaxiFlow'),
    // Logging
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ ENV VALIDATION FAILED:');
    console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
    process.exit(1);
}
exports.env = parsed.data;
//# sourceMappingURL=env.js.map