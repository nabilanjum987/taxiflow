// modules/bookings/bookings.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import * as bookingsService from './bookings.service';
import {
  fareEstimateSchema, createBookingSchema, cancelBookingSchema,
  assignDriverSchema, getBookingsQuerySchema,
} from './bookings.validation';
import { authenticate, authorize } from '../../middleware/authMiddleware';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/responseHelpers';
import type { Server as SocketIOServer } from 'socket.io';

const router = Router();
router.use(authenticate);

const getIo = (req: Request): SocketIOServer => req.app.get('io') as SocketIOServer;

// GET /bookings/fare-estimate
router.get('/fare-estimate', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = fareEstimateSchema.parse(req.query);
    const estimate = await bookingsService.getFareEstimate({ tenantId: req.tenantId, ...input });
    sendSuccess(res, estimate);
  } catch (e) { next(e); }
});

// GET /bookings
router.get('/', authorize('TENANT_ADMIN', 'DISPATCHER', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = getBookingsQuerySchema.parse(req.query);
    const result = await bookingsService.getBookings({ tenantId: req.tenantId, ...query });
    sendPaginated(res, result.bookings, result.pagination);
  } catch (e) { next(e); }
});

// GET /bookings/my — passenger sees own bookings
router.get('/my', authorize('PASSENGER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = getBookingsQuerySchema.parse(req.query);
    const passenger = await import('../../config/database').then(m => m.prisma.passenger.findUnique({ where: { userId: req.user.id }, select: { id: true } }));
    const result = await bookingsService.getBookings({ tenantId: req.tenantId, passengerId: passenger?.id, ...query });
    sendPaginated(res, result.bookings, result.pagination);
  } catch (e) { next(e); }
});

// GET /bookings/driver — driver sees own assigned bookings
router.get('/driver', authorize('DRIVER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = getBookingsQuerySchema.parse(req.query);
    const driver = await import('../../config/database').then(m => m.prisma.driver.findUnique({ where: { userId: req.user.id }, select: { id: true } }));
    const result = await bookingsService.getBookings({ tenantId: req.tenantId, driverId: driver?.id, ...query });
    sendPaginated(res, result.bookings, result.pagination);
  } catch (e) { next(e); }
});

// GET /bookings/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const booking = await bookingsService.getBookingById(req.params.id, req.tenantId);
    sendSuccess(res, booking);
  } catch (e) { next(e); }
});

// POST /bookings — passenger creates booking
router.post('/', authorize('PASSENGER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createBookingSchema.parse(req.body);
    const passenger = await import('../../config/database').then(m => m.prisma.passenger.findUnique({ where: { userId: req.user.id }, select: { id: true } }));
    if (!passenger) { res.status(404).json({ success: false, error: 'Passenger profile not found' }); return; }
    const booking = await bookingsService.createBooking({ tenantId: req.tenantId, passengerId: passenger.id, ...input }, getIo(req));
    sendCreated(res, booking);
  } catch (e) { next(e); }
});

// PATCH /bookings/:id/cancel
router.patch('/:id/cancel', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { reason } = cancelBookingSchema.parse(req.body);
    const booking = await bookingsService.cancelBooking(req.params.id, req.tenantId, req.user.id, reason, getIo(req));
    sendSuccess(res, booking, 'Booking cancelled');
  } catch (e) { next(e); }
});

// POST /bookings/:id/accept — driver accepts
router.post('/:id/accept', authorize('DRIVER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const booking = await bookingsService.acceptBooking(req.params.id, req.tenantId, req.user.id, getIo(req));
    sendSuccess(res, booking);
  } catch (e) { next(e); }
});

// POST /bookings/:id/arrived
router.post('/:id/arrived', authorize('DRIVER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const booking = await bookingsService.markDriverArrived(req.params.id, req.tenantId, req.user.id, getIo(req));
    sendSuccess(res, booking);
  } catch (e) { next(e); }
});

// POST /bookings/:id/start
router.post('/:id/start', authorize('DRIVER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const booking = await bookingsService.startRide(req.params.id, req.tenantId, req.user.id, getIo(req));
    sendSuccess(res, booking);
  } catch (e) { next(e); }
});

// POST /bookings/:id/complete
router.post('/:id/complete', authorize('DRIVER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const booking = await bookingsService.completeRide(req.params.id, req.tenantId, req.user.id, getIo(req));
    sendSuccess(res, booking, 'Ride completed');
  } catch (e) { next(e); }
});

// PATCH /bookings/:id/assign-driver — dispatcher manual assign
router.patch('/:id/assign-driver', authorize('DISPATCHER', 'TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { driverId } = assignDriverSchema.parse(req.body);
    const booking = await bookingsService.manuallyAssignDriver(req.params.id, req.tenantId, driverId, getIo(req));
    sendSuccess(res, booking, 'Driver assigned');
  } catch (e) { next(e); }
});

export default router;
