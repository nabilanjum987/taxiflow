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
// modules/pricing/pricing.routes.ts
const express_1 = require("express");
const zod_1 = require("zod");
const pricingService = __importStar(require("./pricing.service"));
const authMiddleware_1 = require("../../middleware/authMiddleware");
const responseHelpers_1 = require("../../utils/responseHelpers");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
const geoPointSchema = zod_1.z.object({ latitude: zod_1.z.number().min(-90).max(90), longitude: zod_1.z.number().min(-180).max(180) });
const pricingRuleSchema = zod_1.z.object({
    zoneId: zod_1.z.string().uuid().optional(),
    vehicleType: zod_1.z.enum(['STANDARD', 'EXECUTIVE', 'MPV', 'WAV']),
    baseFare: zod_1.z.number().positive(),
    perKmRate: zod_1.z.number().positive(),
    perMinuteRate: zod_1.z.number().positive(),
    minimumFare: zod_1.z.number().positive(),
    bookingFee: zod_1.z.number().min(0).optional(),
    nightMultiplier: zod_1.z.number().min(1).max(5).optional(),
    nightStartHour: zod_1.z.number().int().min(0).max(23).optional(),
    nightEndHour: zod_1.z.number().int().min(0).max(23).optional(),
});
const zoneSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
    polygon: zod_1.z.array(geoPointSchema).min(3, 'Zone must have at least 3 points'),
});
const surgeSchema = zod_1.z.object({
    zoneId: zod_1.z.string().uuid().optional(),
    multiplier: zod_1.z.number().min(1).max(5),
    reason: zod_1.z.string().min(1).max(200),
    startTime: zod_1.z.string().datetime().transform(v => new Date(v)),
    endTime: zod_1.z.string().datetime().transform(v => new Date(v)),
});
// ─── PRICING RULES ────────────────────────────────────────
router.get('/rules', (0, authMiddleware_1.authorize)('TENANT_ADMIN', 'DISPATCHER'), async (req, res, next) => {
    try {
        const rules = await pricingService.getPricingRules(req.tenantId);
        (0, responseHelpers_1.sendSuccess)(res, rules);
    }
    catch (e) {
        next(e);
    }
});
router.post('/rules', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const input = pricingRuleSchema.parse(req.body);
        const rule = await pricingService.createPricingRule({ tenantId: req.tenantId, ...input });
        (0, responseHelpers_1.sendCreated)(res, rule, 'Pricing rule created');
    }
    catch (e) {
        next(e);
    }
});
router.patch('/rules/:id', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const input = pricingRuleSchema.partial().parse(req.body);
        const rule = await pricingService.updatePricingRule(req.params.id, req.tenantId, input);
        (0, responseHelpers_1.sendSuccess)(res, rule, 'Pricing rule updated');
    }
    catch (e) {
        next(e);
    }
});
router.delete('/rules/:id', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        await pricingService.deletePricingRule(req.params.id, req.tenantId);
        (0, responseHelpers_1.sendNoContent)(res);
    }
    catch (e) {
        next(e);
    }
});
// ─── ZONES ────────────────────────────────────────────────
router.get('/zones', async (req, res, next) => {
    try {
        const zones = await pricingService.getZones(req.tenantId);
        (0, responseHelpers_1.sendSuccess)(res, zones);
    }
    catch (e) {
        next(e);
    }
});
router.post('/zones', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const input = zoneSchema.parse(req.body);
        const zone = await pricingService.createZone({ tenantId: req.tenantId, ...input });
        (0, responseHelpers_1.sendCreated)(res, zone, 'Zone created');
    }
    catch (e) {
        next(e);
    }
});
router.patch('/zones/:id', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const input = zoneSchema.partial().parse(req.body);
        const zone = await pricingService.updateZone(req.params.id, req.tenantId, input);
        (0, responseHelpers_1.sendSuccess)(res, zone, 'Zone updated');
    }
    catch (e) {
        next(e);
    }
});
router.delete('/zones/:id', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        await pricingService.deleteZone(req.params.id, req.tenantId);
        (0, responseHelpers_1.sendNoContent)(res);
    }
    catch (e) {
        next(e);
    }
});
// ─── SURGE PRICING ────────────────────────────────────────
router.get('/surge', (0, authMiddleware_1.authorize)('TENANT_ADMIN', 'DISPATCHER'), async (req, res, next) => {
    try {
        const activeOnly = req.query.active === 'true';
        const surge = await pricingService.getSurgePricing(req.tenantId, activeOnly);
        (0, responseHelpers_1.sendSuccess)(res, surge);
    }
    catch (e) {
        next(e);
    }
});
router.post('/surge', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const input = surgeSchema.parse(req.body);
        const surge = await pricingService.createSurgePricing({ tenantId: req.tenantId, ...input });
        (0, responseHelpers_1.sendCreated)(res, surge, 'Surge pricing created');
    }
    catch (e) {
        next(e);
    }
});
router.delete('/surge/:id', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        await pricingService.deactivateSurge(req.params.id, req.tenantId);
        (0, responseHelpers_1.sendNoContent)(res);
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=pricing.routes.js.map