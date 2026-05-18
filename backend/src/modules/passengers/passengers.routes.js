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
// modules/passengers/passengers.routes.ts
const express_1 = require("express");
const zod_1 = require("zod");
const passengersService = __importStar(require("./passengers.service"));
const authMiddleware_1 = require("../../middleware/authMiddleware");
const responseHelpers_1 = require("../../utils/responseHelpers");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
const savedAddressSchema = zod_1.z.object({
    label: zod_1.z.string().min(1).max(50),
    fullAddress: zod_1.z.string().min(1).max(500),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
});
// GET /passengers/me
router.get('/me', (0, authMiddleware_1.authorize)('PASSENGER'), async (req, res, next) => {
    try {
        const profile = await passengersService.getPassengerProfile(req.user.id, req.tenantId);
        (0, responseHelpers_1.sendSuccess)(res, profile);
    }
    catch (e) {
        next(e);
    }
});
// PATCH /passengers/me
router.patch('/me', (0, authMiddleware_1.authorize)('PASSENGER'), async (req, res, next) => {
    try {
        const input = zod_1.z.object({
            firstName: zod_1.z.string().min(1).max(50).optional(),
            lastName: zod_1.z.string().min(1).max(50).optional(),
            email: zod_1.z.string().email().optional(),
            avatarUrl: zod_1.z.string().url().optional(),
        }).parse(req.body);
        const profile = await passengersService.updatePassengerProfile(req.user.id, req.tenantId, input);
        (0, responseHelpers_1.sendSuccess)(res, profile, 'Profile updated');
    }
    catch (e) {
        next(e);
    }
});
// POST /passengers/me/addresses
router.post('/me/addresses', (0, authMiddleware_1.authorize)('PASSENGER'), async (req, res, next) => {
    try {
        const input = savedAddressSchema.parse(req.body);
        const address = await passengersService.addSavedAddress(req.user.id, req.tenantId, input);
        (0, responseHelpers_1.sendCreated)(res, address);
    }
    catch (e) {
        next(e);
    }
});
// DELETE /passengers/me/addresses/:id
router.delete('/me/addresses/:id', (0, authMiddleware_1.authorize)('PASSENGER'), async (req, res, next) => {
    try {
        await passengersService.deleteSavedAddress(req.params.id, req.user.id, req.tenantId);
        (0, responseHelpers_1.sendNoContent)(res);
    }
    catch (e) {
        next(e);
    }
});
// GET /passengers — admin
router.get('/', (0, authMiddleware_1.authorize)('TENANT_ADMIN', 'DISPATCHER', 'SUPER_ADMIN'), async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const result = await passengersService.getPassengers(req.tenantId, page, limit, search);
        (0, responseHelpers_1.sendPaginated)(res, result.passengers, result.pagination);
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=passengers.routes.js.map