"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// modules/payments/payments.routes.ts
const express_1 = require("express");
const zod_1 = require("zod");
const paymentsService = __importStar(require("./payments.service"));
const authMiddleware_1 = require("../../middleware/authMiddleware");
const responseHelpers_1 = require("../../utils/responseHelpers");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
// POST /payments/intent — passenger initiates card payment
router.post('/intent', (0, authMiddleware_1.authorize)('PASSENGER'), async (req, res, next) => {
    try {
        const { bookingId } = zod_1.z.object({ bookingId: zod_1.z.string().uuid() }).parse(req.body);
        const result = await paymentsService.createPaymentIntent(bookingId, req.tenantId);
        (0, responseHelpers_1.sendSuccess)(res, result);
    }
    catch (e) {
        next(e);
    }
});
// POST /payments/confirm
router.post('/confirm', (0, authMiddleware_1.authorize)('PASSENGER'), async (req, res, next) => {
    try {
        const input = zod_1.z.object({
            bookingId: zod_1.z.string().uuid(),
            stripePaymentIntentId: zod_1.z.string().min(1),
        }).parse(req.body);
        const payment = await paymentsService.confirmPayment(input.bookingId, req.tenantId, input.stripePaymentIntentId);
        (0, responseHelpers_1.sendSuccess)(res, payment, 'Payment confirmed');
    }
    catch (e) {
        next(e);
    }
});
// POST /payments/:bookingId/refund — admin refunds
router.post('/:bookingId/refund', (0, authMiddleware_1.authorize)('TENANT_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
    try {
        const input = zod_1.z.object({
            reason: zod_1.z.string().min(1),
            amount: zod_1.z.number().positive().optional(),
        }).parse(req.body);
        const payment = await paymentsService.refundPayment(req.params.bookingId, req.tenantId, input.reason, input.amount);
        (0, responseHelpers_1.sendSuccess)(res, payment, 'Refund processed');
    }
    catch (e) {
        next(e);
    }
});
// GET /payments/history
router.get('/history', (0, authMiddleware_1.authorize)('TENANT_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await paymentsService.getPaymentHistory(req.tenantId, page, limit);
        (0, responseHelpers_1.sendPaginated)(res, result.payments, result.pagination);
    }
    catch (e) {
        next(e);
    }
});
// POST /payments/payout — admin triggers driver payout
router.post('/payout', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const input = zod_1.z.object({
            driverId: zod_1.z.string().uuid(),
            periodStart: zod_1.z.string().datetime().transform(v => new Date(v)),
            periodEnd: zod_1.z.string().datetime().transform(v => new Date(v)),
        }).parse(req.body);
        const payout = await paymentsService.processDriverPayout(input.driverId, req.tenantId, input.periodStart, input.periodEnd);
        (0, responseHelpers_1.sendSuccess)(res, payout, 'Payout processed');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=payments.routes.js.map