"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpServer = exports.app = void 0;
require("dotenv/config"); // app.ts — TaxiFlow Backend Phase 5 COMPLETE
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const logger_1 = require("./config/logger");
const tenantMiddleware_1 = require("./middleware/tenantMiddleware");
const rateLimitMiddleware_1 = require("./middleware/rateLimitMiddleware");
const errorMiddleware_1 = require("./middleware/errorMiddleware");
const socketServer_1 = require("./sockets/socketServer");
const workers_1 = require("./jobs/workers");
const scheduledJobs_1 = require("./jobs/scheduledJobs");
const queues_1 = require("./jobs/queues");
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const tenants_routes_1 = __importDefault(require("./modules/tenants/tenants.routes"));
const bookings_routes_1 = __importDefault(require("./modules/bookings/bookings.routes"));
const drivers_routes_1 = __importDefault(require("./modules/drivers/drivers.routes"));
const passengers_routes_1 = __importDefault(require("./modules/passengers/passengers.routes"));
const pricing_routes_1 = __importDefault(require("./modules/pricing/pricing.routes"));
const payments_routes_1 = __importDefault(require("./modules/payments/payments.routes"));
const notifications_routes_1 = __importDefault(require("./modules/notifications/notifications.routes"));
const ratings_routes_1 = __importDefault(require("./modules/ratings/ratings.routes"));
const promotions_routes_1 = __importDefault(require("./modules/promotions/promotions.routes"));
const reports_routes_1 = __importDefault(require("./modules/reports/reports.routes"));
const support_routes_1 = __importDefault(require("./modules/support/support.routes"));
const subscriptions_routes_1 = __importDefault(require("./modules/subscriptions/subscriptions.routes"));
const onboarding_routes_1 = __importDefault(require("./modules/onboarding/onboarding.routes"));
const stripe_webhook_1 = require("./modules/webhooks/stripe.webhook");
const shared_constants_1 = require("@taxiflow/shared-constants");
console.log('🔍 app.ts loaded, starting bootstrap...');
const app = (0, express_1.default)();
exports.app = app;
const httpServer = http_1.default.createServer(app);
exports.httpServer = httpServer;
// CRITICAL: Stripe webhook must use raw body BEFORE express.json()
app.post(`${shared_constants_1.API_PREFIX}/webhooks/stripe`, express_1.default.raw({ type: 'application/json' }), stripe_webhook_1.handleStripeWebhook);
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use((0, cors_1.default)({
    origin: (origin, cb) => {
        const ok = [env_1.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004'].filter(Boolean);
        (!origin || ok.includes(origin)) ? cb(null, true) : cb(new Error('CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-request-id'],
}));
app.use((0, compression_1.default)());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, morgan_1.default)('combined', { stream: { write: (m) => logger_1.logger.info(m.trim()) }, skip: r => r.path === '/health' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', version: '5.0.0', env: env_1.env.NODE_ENV }));
// Public routes (no tenant needed)
app.use(`${shared_constants_1.API_PREFIX}/subscriptions`, subscriptions_routes_1.default);
// Protected routes
app.use(shared_constants_1.API_PREFIX, rateLimitMiddleware_1.apiRateLimit);
app.use(shared_constants_1.API_PREFIX, tenantMiddleware_1.tenantMiddleware);
app.use(`${shared_constants_1.API_PREFIX}/auth`, auth_routes_1.default);
app.use(`${shared_constants_1.API_PREFIX}/tenants`, tenants_routes_1.default);
app.use(`${shared_constants_1.API_PREFIX}/bookings`, bookings_routes_1.default);
app.use(`${shared_constants_1.API_PREFIX}/drivers`, drivers_routes_1.default);
app.use(`${shared_constants_1.API_PREFIX}/passengers`, passengers_routes_1.default);
app.use(`${shared_constants_1.API_PREFIX}/pricing`, pricing_routes_1.default);
app.use(`${shared_constants_1.API_PREFIX}/payments`, payments_routes_1.default);
app.use(`${shared_constants_1.API_PREFIX}/notifications`, notifications_routes_1.default);
app.use(`${shared_constants_1.API_PREFIX}/ratings`, ratings_routes_1.default);
app.use(`${shared_constants_1.API_PREFIX}/promotions`, promotions_routes_1.default);
app.use(`${shared_constants_1.API_PREFIX}/reports`, reports_routes_1.default);
app.use(`${shared_constants_1.API_PREFIX}/support`, support_routes_1.default);
app.use(`${shared_constants_1.API_PREFIX}/onboarding`, onboarding_routes_1.default);
app.use(errorMiddleware_1.notFoundMiddleware);
app.use(errorMiddleware_1.errorMiddleware);
async function bootstrap() {
    logger_1.logger.info('🚀 TaxiFlow v5.0 starting...');
    await (0, database_1.connectDatabase)();
    await (0, redis_1.connectRedis)();
    const io = (0, socketServer_1.initializeSocketServer)(httpServer);
    app.set('io', io);
    (0, workers_1.startWorkers)();
    (0, scheduledJobs_1.startScheduledJobs)();
    httpServer.listen(env_1.env.PORT, () => logger_1.logger.info(`✅ Running on :${env_1.env.PORT} [${env_1.env.NODE_ENV}] — 15 modules active`));
}
async function shutdown(sig) {
    logger_1.logger.info(`${sig} — shutting down`);
    httpServer.close(async () => { await (0, queues_1.closeQueues)(); await (0, database_1.disconnectDatabase)(); await (0, redis_1.disconnectRedis)(); process.exit(0); });
    setTimeout(() => process.exit(1), 30000);
}
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('uncaughtException', e => { logger_1.logger.error('uncaughtException', { e }); process.exit(1); });
process.on('unhandledRejection', r => { logger_1.logger.error('unhandledRejection', { r }); process.exit(1); });
console.log('🔍 calling bootstrap now...');
void bootstrap();
//# sourceMappingURL=app.js.map