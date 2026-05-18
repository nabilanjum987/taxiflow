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
// modules/bookings/bookings.routes.ts
const express_1 = require("express");
const bookingsService = __importStar(require("./bookings.service"));
const bookings_validation_1 = require("./bookings.validation");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const responseHelpers_1 = require("../../utils/responseHelpers");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
const getIo = (req) => req.app.get('io');
// GET /bookings/fare-estimate
router.get('/fare-estimate', async (req, res, next) => {
    try {
        const input = bookings_validation_1.fareEstimateSchema.parse(req.query);
        const estimate = await bookingsService.getFareEstimate({ tenantId: req.tenantId, ...input });
        (0, responseHelpers_1.sendSuccess)(res, estimate);
    }
    catch (e) {
        next(e);
    }
});
// GET /bookings
router.get('/', (0, authMiddleware_1.authorize)('TENANT_ADMIN', 'DISPATCHER', 'SUPER_ADMIN'), async (req, res, next) => {
    try {
        const query = bookings_validation_1.getBookingsQuerySchema.parse(req.query);
        const result = await bookingsService.getBookings({ tenantId: req.tenantId, ...query });
        (0, responseHelpers_1.sendPaginated)(res, result.bookings, result.pagination);
    }
    catch (e) {
        next(e);
    }
});
// GET /bookings/my — passenger sees own bookings
router.get('/my', (0, authMiddleware_1.authorize)('PASSENGER'), async (req, res, next) => {
    try {
        const query = bookings_validation_1.getBookingsQuerySchema.parse(req.query);
        const passenger = await Promise.resolve().then(() => __importStar(require('../../config/database'))).then(m => m.prisma.passenger.findUnique({ where: { userId: req.user.id }, select: { id: true } }));
        const result = await bookingsService.getBookings({ tenantId: req.tenantId, passengerId: passenger?.id, ...query });
        (0, responseHelpers_1.sendPaginated)(res, result.bookings, result.pagination);
    }
    catch (e) {
        next(e);
    }
});
// GET /bookings/driver — driver sees own assigned bookings
router.get('/driver', (0, authMiddleware_1.authorize)('DRIVER'), async (req, res, next) => {
    try {
        const query = bookings_validation_1.getBookingsQuerySchema.parse(req.query);
        const driver = await Promise.resolve().then(() => __importStar(require('../../config/database'))).then(m => m.prisma.driver.findUnique({ where: { userId: req.user.id }, select: { id: true } }));
        const result = await bookingsService.getBookings({ tenantId: req.tenantId, driverId: driver?.id, ...query });
        (0, responseHelpers_1.sendPaginated)(res, result.bookings, result.pagination);
    }
    catch (e) {
        next(e);
    }
});
// GET /bookings/:id
router.get('/:id', async (req, res, next) => {
    try {
        const booking = await bookingsService.getBookingById(req.params.id, req.tenantId);
        (0, responseHelpers_1.sendSuccess)(res, booking);
    }
    catch (e) {
        next(e);
    }
});
// POST /bookings — passenger creates booking
router.post('/', (0, authMiddleware_1.authorize)('PASSENGER'), async (req, res, next) => {
    try {
        const input = bookings_validation_1.createBookingSchema.parse(req.body);
        const passenger = await Promise.resolve().then(() => __importStar(require('../../config/database'))).then(m => m.prisma.passenger.findUnique({ where: { userId: req.user.id }, select: { id: true } }));
        if (!passenger) {
            res.status(404).json({ success: false, error: 'Passenger profile not found' });
            return;
        }
        const booking = await bookingsService.createBooking({ tenantId: req.tenantId, passengerId: passenger.id, ...input }, getIo(req));
        (0, responseHelpers_1.sendCreated)(res, booking);
    }
    catch (e) {
        next(e);
    }
});
// PATCH /bookings/:id/cancel
router.patch('/:id/cancel', async (req, res, next) => {
    try {
        const { reason } = bookings_validation_1.cancelBookingSchema.parse(req.body);
        const booking = await bookingsService.cancelBooking(req.params.id, req.tenantId, req.user.id, reason, getIo(req));
        (0, responseHelpers_1.sendSuccess)(res, booking, 'Booking cancelled');
    }
    catch (e) {
        next(e);
    }
});
// POST /bookings/:id/accept — driver accepts
router.post('/:id/accept', (0, authMiddleware_1.authorize)('DRIVER'), async (req, res, next) => {
    try {
        const booking = await bookingsService.acceptBooking(req.params.id, req.tenantId, req.user.id, getIo(req));
        (0, responseHelpers_1.sendSuccess)(res, booking);
    }
    catch (e) {
        next(e);
    }
});
// POST /bookings/:id/arrived
router.post('/:id/arrived', (0, authMiddleware_1.authorize)('DRIVER'), async (req, res, next) => {
    try {
        const booking = await bookingsService.markDriverArrived(req.params.id, req.tenantId, req.user.id, getIo(req));
        (0, responseHelpers_1.sendSuccess)(res, booking);
    }
    catch (e) {
        next(e);
    }
});
// POST /bookings/:id/start
router.post('/:id/start', (0, authMiddleware_1.authorize)('DRIVER'), async (req, res, next) => {
    try {
        const booking = await bookingsService.startRide(req.params.id, req.tenantId, req.user.id, getIo(req));
        (0, responseHelpers_1.sendSuccess)(res, booking);
    }
    catch (e) {
        next(e);
    }
});
// POST /bookings/:id/complete
router.post('/:id/complete', (0, authMiddleware_1.authorize)('DRIVER'), async (req, res, next) => {
    try {
        const booking = await bookingsService.completeRide(req.params.id, req.tenantId, req.user.id, getIo(req));
        (0, responseHelpers_1.sendSuccess)(res, booking, 'Ride completed');
    }
    catch (e) {
        next(e);
    }
});
// PATCH /bookings/:id/assign-driver — dispatcher manual assign
router.patch('/:id/assign-driver', (0, authMiddleware_1.authorize)('DISPATCHER', 'TENANT_ADMIN'), async (req, res, next) => {
    try {
        const { driverId } = bookings_validation_1.assignDriverSchema.parse(req.body);
        const booking = await bookingsService.manuallyAssignDriver(req.params.id, req.tenantId, driverId, getIo(req));
        (0, responseHelpers_1.sendSuccess)(res, booking, 'Driver assigned');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=bookings.routes.js.map