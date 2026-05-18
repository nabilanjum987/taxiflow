"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookingsQuerySchema = exports.assignDriverSchema = exports.cancelBookingSchema = exports.createBookingSchema = exports.fareEstimateSchema = void 0;
// modules/bookings/bookings.validation.ts
const zod_1 = require("zod");
exports.fareEstimateSchema = zod_1.z.object({
    pickupLatitude: zod_1.z.number().min(-90).max(90),
    pickupLongitude: zod_1.z.number().min(-180).max(180),
    dropoffLatitude: zod_1.z.number().min(-90).max(90),
    dropoffLongitude: zod_1.z.number().min(-180).max(180),
    vehicleType: zod_1.z.enum(['STANDARD', 'EXECUTIVE', 'MPV', 'WAV']),
    promoCode: zod_1.z.string().optional(),
});
exports.createBookingSchema = zod_1.z.object({
    pickupAddress: zod_1.z.string().min(1).max(500),
    pickupLatitude: zod_1.z.number().min(-90).max(90),
    pickupLongitude: zod_1.z.number().min(-180).max(180),
    dropoffAddress: zod_1.z.string().min(1).max(500),
    dropoffLatitude: zod_1.z.number().min(-90).max(90),
    dropoffLongitude: zod_1.z.number().min(-180).max(180),
    vehicleType: zod_1.z.enum(['STANDARD', 'EXECUTIVE', 'MPV', 'WAV']),
    paymentMethod: zod_1.z.enum(['CARD', 'CASH', 'CORPORATE']),
    promoCode: zod_1.z.string().optional(),
    scheduledAt: zod_1.z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
    notes: zod_1.z.string().max(500).optional(),
    corporateAccountId: zod_1.z.string().uuid().optional(),
});
exports.cancelBookingSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1).max(200),
});
exports.assignDriverSchema = zod_1.z.object({
    driverId: zod_1.z.string().uuid(),
});
exports.getBookingsQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform(v => v ? parseInt(v) : 1),
    limit: zod_1.z.string().optional().transform(v => v ? parseInt(v) : 20),
    status: zod_1.z.enum(['PENDING', 'SEARCHING', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_DRIVER_FOUND']).optional(),
    driverId: zod_1.z.string().uuid().optional(),
    passengerId: zod_1.z.string().uuid().optional(),
    dateFrom: zod_1.z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
    dateTo: zod_1.z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
});
//# sourceMappingURL=bookings.validation.js.map