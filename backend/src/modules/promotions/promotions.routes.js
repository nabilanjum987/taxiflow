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
// modules/promotions/promotions.routes.ts
const express_1 = require("express");
const zod_1 = require("zod");
const promotionsService = __importStar(require("./promotions.service"));
const authMiddleware_1 = require("../../middleware/authMiddleware");
const responseHelpers_1 = require("../../utils/responseHelpers");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
const promoSchema = zod_1.z.object({
    code: zod_1.z.string().min(3).max(20).toUpperCase(),
    description: zod_1.z.string().min(1).max(200),
    discountType: zod_1.z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
    discountValue: zod_1.z.number().positive(),
    minimumFare: zod_1.z.number().positive().optional(),
    maximumDiscount: zod_1.z.number().positive().optional(),
    usageLimit: zod_1.z.number().int().positive().optional(),
    perUserLimit: zod_1.z.number().int().positive().optional(),
    validFrom: zod_1.z.string().datetime().transform(v => new Date(v)),
    validUntil: zod_1.z.string().datetime().transform(v => new Date(v)),
});
router.get('/', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await promotionsService.getPromotions(req.tenantId, page, limit);
        (0, responseHelpers_1.sendPaginated)(res, result.promos, result.pagination);
    }
    catch (e) {
        next(e);
    }
});
router.post('/', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const input = promoSchema.parse(req.body);
        const promo = await promotionsService.createPromotion({ tenantId: req.tenantId, ...input });
        (0, responseHelpers_1.sendCreated)(res, promo, 'Promo code created');
    }
    catch (e) {
        next(e);
    }
});
// GET /promotions/validate?code=SAVE10&fare=25 — passenger validates before booking
router.get('/validate', async (req, res, next) => {
    try {
        const { code, fare } = zod_1.z.object({
            code: zod_1.z.string().min(1),
            fare: zod_1.z.string().transform(Number),
        }).parse(req.query);
        const result = await promotionsService.validatePromoCode(req.tenantId, code, fare);
        (0, responseHelpers_1.sendSuccess)(res, result);
    }
    catch (e) {
        next(e);
    }
});
router.patch('/:id/toggle', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const { isActive } = zod_1.z.object({ isActive: zod_1.z.boolean() }).parse(req.body);
        const promo = await promotionsService.togglePromotion(req.params.id, req.tenantId, isActive);
        (0, responseHelpers_1.sendSuccess)(res, promo);
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=promotions.routes.js.map