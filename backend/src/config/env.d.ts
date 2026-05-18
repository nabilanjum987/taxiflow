import 'dotenv/config';
export declare const env: {
    NODE_ENV: "development" | "test" | "production";
    PORT: number;
    APP_URL: string;
    DATABASE_URL: string;
    REDIS_URL: string;
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_ACCESS_EXPIRY: string;
    JWT_REFRESH_EXPIRY: string;
    ENCRYPTION_KEY: string;
    AWS_S3_REGION: string;
    EMAIL_FROM: string;
    EMAIL_FROM_NAME: string;
    LOG_LEVEL: "error" | "debug" | "warn" | "info";
    FRONTEND_URL?: string | undefined;
    GOOGLE_MAPS_API_KEY?: string | undefined;
    SENDGRID_API_KEY?: string | undefined;
    AWS_ACCESS_KEY_ID?: string | undefined;
    AWS_SECRET_ACCESS_KEY?: string | undefined;
    AWS_S3_BUCKET?: string | undefined;
    FIREBASE_SERVICE_ACCOUNT_JSON?: string | undefined;
    STRIPE_SECRET_KEY?: string | undefined;
    STRIPE_PUBLISHABLE_KEY?: string | undefined;
    STRIPE_WEBHOOK_SECRET?: string | undefined;
};
export type Env = typeof env;
//# sourceMappingURL=env.d.ts.map