// modules/bookings/bookings.validation.ts
import { z } from 'zod';

export const fareEstimateSchema = z.object({
  pickupLatitude: z.number().min(-90).max(90),
  pickupLongitude: z.number().min(-180).max(180),
  dropoffLatitude: z.number().min(-90).max(90),
  dropoffLongitude: z.number().min(-180).max(180),
  vehicleType: z.enum(['STANDARD', 'EXECUTIVE', 'MPV', 'WAV']),
  promoCode: z.string().optional(),
});

export const createBookingSchema = z.object({
  pickupAddress: z.string().min(1).max(500),
  pickupLatitude: z.number().min(-90).max(90),
  pickupLongitude: z.number().min(-180).max(180),
  dropoffAddress: z.string().min(1).max(500),
  dropoffLatitude: z.number().min(-90).max(90),
  dropoffLongitude: z.number().min(-180).max(180),
  vehicleType: z.enum(['STANDARD', 'EXECUTIVE', 'MPV', 'WAV']),
  paymentMethod: z.enum(['CARD', 'CASH', 'CORPORATE']),
  promoCode: z.string().optional(),
  scheduledAt: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  notes: z.string().max(500).optional(),
  corporateAccountId: z.string().uuid().optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().min(1).max(200),
});

export const assignDriverSchema = z.object({
  driverId: z.string().uuid(),
});

export const getBookingsQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? parseInt(v) : 20),
  status: z.enum(['PENDING', 'SEARCHING', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_DRIVER_FOUND']).optional(),
  driverId: z.string().uuid().optional(),
  passengerId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  dateTo: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
});
