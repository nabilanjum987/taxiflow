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
// modules/drivers/drivers.routes.ts
const express_1 = require("express");
const zod_1 = require("zod");
const driversService = __importStar(require("./drivers.service"));
const authMiddleware_1 = require("../../middleware/authMiddleware");
const responseHelpers_1 = require("../../utils/responseHelpers");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
const registerDriverSchema = zod_1.z.object({
    licenseNumber: zod_1.z.string().min(1).max(50),
    licenseExpiry: zod_1.z.string().datetime().transform(v => new Date(v)),
});
const addVehicleSchema = zod_1.z.object({
    make: zod_1.z.string().min(1).max(50),
    model: zod_1.z.string().min(1).max(50),
    year: zod_1.z.number().int().min(1990).max(new Date().getFullYear() + 1),
    color: zod_1.z.string().min(1).max(30),
    licensePlate: zod_1.z.string().min(1).max(15),
    vehicleType: zod_1.z.enum(['STANDARD', 'EXECUTIVE', 'MPV', 'WAV']),
    seats: zod_1.z.number().int().min(2).max(16),
    insuranceExpiry: zod_1.z.string().datetime().transform(v => new Date(v)),
    motExpiry: zod_1.z.string().datetime().transform(v => new Date(v)),
});
const getDriversQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform(v => v ? parseInt(v) : 1),
    limit: zod_1.z.string().optional().transform(v => v ? parseInt(v) : 20),
    status: zod_1.z.enum(['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED', 'INACTIVE']).optional(),
    onlineStatus: zod_1.z.enum(['ONLINE', 'OFFLINE', 'ON_TRIP']).optional(),
    search: zod_1.z.string().optional(),
});
// POST /drivers/register — driver self-registers
router.post('/register', (0, authMiddleware_1.authorize)('DRIVER'), async (req, res, next) => {
    try {
        const input = registerDriverSchema.parse(req.body);
        const driver = await driversService.registerDriverProfile({ tenantId: req.tenantId, userId: req.user.id, ...input });
        (0, responseHelpers_1.sendCreated)(res, driver, 'Driver profile created. Pending approval.');
    }
    catch (e) {
        next(e);
    }
});
// GET /drivers — admin sees all drivers
router.get('/', (0, authMiddleware_1.authorize)('TENANT_ADMIN', 'DISPATCHER', 'SUPER_ADMIN'), async (req, res, next) => {
    try {
        const query = getDriversQuerySchema.parse(req.query);
        const result = await driversService.getDrivers({ tenantId: req.tenantId, ...query });
        (0, responseHelpers_1.sendPaginated)(res, result.drivers, result.pagination);
    }
    catch (e) {
        next(e);
    }
});
// GET /drivers/online — dispatcher live map
router.get('/online', (0, authMiddleware_1.authorize)('TENANT_ADMIN', 'DISPATCHER'), async (req, res, next) => {
    try {
        const drivers = await driversService.getOnlineDrivers(req.tenantId);
        (0, responseHelpers_1.sendSuccess)(res, drivers);
    }
    catch (e) {
        next(e);
    }
});
// GET /drivers/me — driver sees own profile
router.get('/me', (0, authMiddleware_1.authorize)('DRIVER'), async (req, res, next) => {
    try {
        const driver = await Promise.resolve().then(() => __importStar(require('../../config/database'))).then(m => m.prisma.driver.findUnique({
            where: { userId: req.user.id },
            include: {
                user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
                vehicles: true,
                documents: true,
            },
        }));
        if (!driver) {
            res.status(404).json({ success: false, error: 'Driver profile not found' });
            return;
        }
        (0, responseHelpers_1.sendSuccess)(res, driver);
    }
    catch (e) {
        next(e);
    }
});
// GET /drivers/me/earnings
router.get('/me/earnings', (0, authMiddleware_1.authorize)('DRIVER'), async (req, res, next) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const driver = await Promise.resolve().then(() => __importStar(require('../../config/database'))).then(m => m.prisma.driver.findUnique({ where: { userId: req.user.id }, select: { id: true } }));
        if (!driver) {
            res.status(404).json({ success: false, error: 'Driver not found' });
            return;
        }
        const earnings = await driversService.getDriverEarnings(driver.id, req.tenantId, days);
        (0, responseHelpers_1.sendSuccess)(res, earnings);
    }
    catch (e) {
        next(e);
    }
});
// GET /drivers/:id
router.get('/:id', (0, authMiddleware_1.authorize)('TENANT_ADMIN', 'DISPATCHER', 'SUPER_ADMIN'), async (req, res, next) => {
    try {
        const driver = await driversService.getDriverById(req.params.id, req.tenantId);
        (0, responseHelpers_1.sendSuccess)(res, driver);
    }
    catch (e) {
        next(e);
    }
});
// GET /drivers/:id/earnings — admin views driver earnings
router.get('/:id/earnings', (0, authMiddleware_1.authorize)('TENANT_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const earnings = await driversService.getDriverEarnings(req.params.id, req.tenantId, days);
        (0, responseHelpers_1.sendSuccess)(res, earnings);
    }
    catch (e) {
        next(e);
    }
});
// POST /drivers/:id/approve
router.post('/:id/approve', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const driver = await driversService.approveDriver(req.params.id, req.tenantId, req.user.id);
        (0, responseHelpers_1.sendSuccess)(res, driver, 'Driver approved');
    }
    catch (e) {
        next(e);
    }
});
// POST /drivers/:id/reject
router.post('/:id/reject', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const { reason } = zod_1.z.object({ reason: zod_1.z.string().min(1) }).parse(req.body);
        const driver = await driversService.rejectDriver(req.params.id, req.tenantId, reason);
        (0, responseHelpers_1.sendSuccess)(res, driver, 'Driver rejected');
    }
    catch (e) {
        next(e);
    }
});
// POST /drivers/:id/suspend
router.post('/:id/suspend', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const { reason } = zod_1.z.object({ reason: zod_1.z.string().min(1) }).parse(req.body);
        const driver = await driversService.suspendDriver(req.params.id, req.tenantId, reason);
        (0, responseHelpers_1.sendSuccess)(res, driver, 'Driver suspended');
    }
    catch (e) {
        next(e);
    }
});
// PATCH /drivers/me/status — driver goes online/offline
router.patch('/me/status', (0, authMiddleware_1.authorize)('DRIVER'), async (req, res, next) => {
    try {
        const { online } = zod_1.z.object({ online: zod_1.z.boolean() }).parse(req.body);
        const result = await driversService.setDriverOnlineStatus(req.user.id, req.tenantId, online);
        (0, responseHelpers_1.sendSuccess)(res, result);
    }
    catch (e) {
        next(e);
    }
});
// POST /drivers/me/vehicles — driver adds vehicle
router.post('/me/vehicles', (0, authMiddleware_1.authorize)('DRIVER'), async (req, res, next) => {
    try {
        const input = addVehicleSchema.parse(req.body);
        const vehicle = await driversService.addVehicle({ tenantId: req.tenantId, driverUserId: req.user.id, ...input });
        (0, responseHelpers_1.sendCreated)(res, vehicle, 'Vehicle added');
    }
    catch (e) {
        next(e);
    }
});
// POST /drivers/me/documents — driver uploads document URL
router.post('/me/documents', (0, authMiddleware_1.authorize)('DRIVER'), async (req, res, next) => {
    try {
        const input = zod_1.z.object({
            type: zod_1.z.enum(['DRIVING_LICENSE', 'INSURANCE', 'DBS_CHECK', 'VEHICLE_REGISTRATION', 'MOT_CERTIFICATE', 'PROFILE_PHOTO', 'VEHICLE_PHOTO']),
            fileUrl: zod_1.z.string().url(),
            expiryDate: zod_1.z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
        }).parse(req.body);
        const doc = await driversService.saveDocumentRecord(req.tenantId, req.user.id, input.type, input.fileUrl, input.expiryDate);
        (0, responseHelpers_1.sendCreated)(res, doc, 'Document uploaded');
    }
    catch (e) {
        next(e);
    }
});
// PATCH /drivers/documents/:id/verify — admin verifies document
router.patch('/documents/:id/verify', (0, authMiddleware_1.authorize)('TENANT_ADMIN'), async (req, res, next) => {
    try {
        const input = zod_1.z.object({ approved: zod_1.z.boolean(), rejectionReason: zod_1.z.string().optional() }).parse(req.body);
        const doc = await driversService.verifyDocument(req.params.id, req.tenantId, req.user.id, input.approved, input.rejectionReason);
        (0, responseHelpers_1.sendSuccess)(res, doc, input.approved ? 'Document approved' : 'Document rejected');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=drivers.routes.js.map