// app.ts — TaxiFlow Backend Phase 5 COMPLETE
import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { logger } from './config/logger';
import { tenantMiddleware } from './middleware/tenantMiddleware';
import { apiRateLimit } from './middleware/rateLimitMiddleware';
import { errorMiddleware, notFoundMiddleware } from './middleware/errorMiddleware';
import { initializeSocketServer } from './sockets/socketServer';
import { startWorkers } from './jobs/workers';
import { startScheduledJobs } from './jobs/scheduledJobs';
import { closeQueues } from './jobs/queues';
import authRoutes from './modules/auth/auth.routes';
import tenantRoutes from './modules/tenants/tenants.routes';
import bookingRoutes from './modules/bookings/bookings.routes';
import driverRoutes from './modules/drivers/drivers.routes';
import passengerRoutes from './modules/passengers/passengers.routes';
import pricingRoutes from './modules/pricing/pricing.routes';
import paymentRoutes from './modules/payments/payments.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import ratingRoutes from './modules/ratings/ratings.routes';
import promotionRoutes from './modules/promotions/promotions.routes';
import reportRoutes from './modules/reports/reports.routes';
import supportRoutes from './modules/support/support.routes';
import subscriptionRoutes from './modules/subscriptions/subscriptions.routes';
import onboardingRoutes from './modules/onboarding/onboarding.routes';
import { handleStripeWebhook } from './modules/webhooks/stripe.webhook';
import { API_PREFIX } from '@taxiflow/shared-constants';

const app: express.Application = express();
const httpServer = http.createServer(app);

// CRITICAL: Stripe webhook must use raw body BEFORE express.json()
app.post(`${API_PREFIX}/webhooks/stripe`, express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, cb) => {
    const ok = [env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004'].filter(Boolean) as string[];
    (!origin || ok.includes(origin)) ? cb(null, true) : cb(new Error('CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','x-tenant-id','x-request-id'],
}));
app.use(compression()); app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (m: string) => logger.info(m.trim()) }, skip: r => r.path === '/health' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', version: '5.0.0', env: env.NODE_ENV }));

// Public routes (no tenant needed)
app.use(`${API_PREFIX}/subscriptions`, subscriptionRoutes);

// Protected routes
app.use(API_PREFIX, apiRateLimit);
app.use(API_PREFIX, tenantMiddleware);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/tenants`, tenantRoutes);
app.use(`${API_PREFIX}/bookings`, bookingRoutes);
app.use(`${API_PREFIX}/drivers`, driverRoutes);
app.use(`${API_PREFIX}/passengers`, passengerRoutes);
app.use(`${API_PREFIX}/pricing`, pricingRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/ratings`, ratingRoutes);
app.use(`${API_PREFIX}/promotions`, promotionRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/support`, supportRoutes);
app.use(`${API_PREFIX}/onboarding`, onboardingRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

async function bootstrap(): Promise<void> {
  logger.info('🚀 TaxiFlow v5.0 starting...');
  await connectDatabase(); await connectRedis();
  const io = initializeSocketServer(httpServer);
  app.set('io', io);
  startWorkers(); startScheduledJobs();
  httpServer.listen(env.PORT, () => logger.info(`✅ Running on :${env.PORT} [${env.NODE_ENV}] — 15 modules active`));
}

async function shutdown(sig: string): Promise<void> {
  logger.info(`${sig} — shutting down`);
  httpServer.close(async () => { await closeQueues(); await disconnectDatabase(); await disconnectRedis(); process.exit(0); });
  setTimeout(() => process.exit(1), 30000);
}

process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('uncaughtException', e => { logger.error('uncaughtException', { e }); process.exit(1); });
process.on('unhandledRejection', r => { logger.error('unhandledRejection', { r }); process.exit(1); });

void bootstrap();
export { app, httpServer };
