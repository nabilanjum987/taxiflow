// modules/drivers/drivers.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as driversService from './drivers.service';
import { authenticate, authorize } from '../../middleware/authMiddleware';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/responseHelpers';

const router = Router();
router.use(authenticate);

const registerDriverSchema = z.object({
  licenseNumber: z.string().min(1).max(50),
  licenseExpiry: z.string().datetime().transform(v => new Date(v)),
});

const addVehicleSchema = z.object({
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  color: z.string().min(1).max(30),
  licensePlate: z.string().min(1).max(15),
  vehicleType: z.enum(['STANDARD', 'EXECUTIVE', 'MPV', 'WAV']),
  seats: z.number().int().min(2).max(16),
  insuranceExpiry: z.string().datetime().transform(v => new Date(v)),
  motExpiry: z.string().datetime().transform(v => new Date(v)),
});

const getDriversQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? parseInt(v) : 20),
  status: z.enum(['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED', 'INACTIVE']).optional(),
  onlineStatus: z.enum(['ONLINE', 'OFFLINE', 'ON_TRIP']).optional(),
  search: z.string().optional(),
});

// POST /drivers/register — driver self-registers
router.post('/register', authorize('DRIVER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = registerDriverSchema.parse(req.body);
    const driver = await driversService.registerDriverProfile({ tenantId: req.tenantId, userId: req.user.id, ...input });
    sendCreated(res, driver, 'Driver profile created. Pending approval.');
  } catch (e) { next(e); }
});

// GET /drivers — admin sees all drivers
router.get('/', authorize('TENANT_ADMIN', 'DISPATCHER', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = getDriversQuerySchema.parse(req.query);
    const result = await driversService.getDrivers({ tenantId: req.tenantId, ...query });
    sendPaginated(res, result.drivers, result.pagination);
  } catch (e) { next(e); }
});

// GET /drivers/online — dispatcher live map
router.get('/online', authorize('TENANT_ADMIN', 'DISPATCHER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const drivers = await driversService.getOnlineDrivers(req.tenantId);
    sendSuccess(res, drivers);
  } catch (e) { next(e); }
});

// GET /drivers/me — driver sees own profile
router.get('/me', authorize('DRIVER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const driver = await import('../../config/database').then(m =>
      m.prisma.driver.findUnique({
        where: { userId: req.user.id },
        include: {
          user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
          vehicles: true,
          documents: true,
        },
      })
    );
    if (!driver) { res.status(404).json({ success: false, error: 'Driver profile not found' }); return; }
    sendSuccess(res, driver);
  } catch (e) { next(e); }
});

// GET /drivers/me/earnings
router.get('/me/earnings', authorize('DRIVER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const driver = await import('../../config/database').then(m => m.prisma.driver.findUnique({ where: { userId: req.user.id }, select: { id: true } }));
    if (!driver) { res.status(404).json({ success: false, error: 'Driver not found' }); return; }
    const earnings = await driversService.getDriverEarnings(driver.id, req.tenantId, days);
    sendSuccess(res, earnings);
  } catch (e) { next(e); }
});

// GET /drivers/:id
router.get('/:id', authorize('TENANT_ADMIN', 'DISPATCHER', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const driver = await driversService.getDriverById(req.params.id, req.tenantId);
    sendSuccess(res, driver);
  } catch (e) { next(e); }
});

// GET /drivers/:id/earnings — admin views driver earnings
router.get('/:id/earnings', authorize('TENANT_ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const earnings = await driversService.getDriverEarnings(req.params.id, req.tenantId, days);
    sendSuccess(res, earnings);
  } catch (e) { next(e); }
});

// POST /drivers/:id/approve
router.post('/:id/approve', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const driver = await driversService.approveDriver(req.params.id, req.tenantId, req.user.id);
    sendSuccess(res, driver, 'Driver approved');
  } catch (e) { next(e); }
});

// POST /drivers/:id/reject
router.post('/:id/reject', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { reason } = z.object({ reason: z.string().min(1) }).parse(req.body);
    const driver = await driversService.rejectDriver(req.params.id, req.tenantId, reason);
    sendSuccess(res, driver, 'Driver rejected');
  } catch (e) { next(e); }
});

// POST /drivers/:id/suspend
router.post('/:id/suspend', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { reason } = z.object({ reason: z.string().min(1) }).parse(req.body);
    const driver = await driversService.suspendDriver(req.params.id, req.tenantId, reason);
    sendSuccess(res, driver, 'Driver suspended');
  } catch (e) { next(e); }
});

// PATCH /drivers/me/status — driver goes online/offline
router.patch('/me/status', authorize('DRIVER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { online } = z.object({ online: z.boolean() }).parse(req.body);
    const result = await driversService.setDriverOnlineStatus(req.user.id, req.tenantId, online);
    sendSuccess(res, result);
  } catch (e) { next(e); }
});

// POST /drivers/me/vehicles — driver adds vehicle
router.post('/me/vehicles', authorize('DRIVER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = addVehicleSchema.parse(req.body);
    const vehicle = await driversService.addVehicle({ tenantId: req.tenantId, driverUserId: req.user.id, ...input });
    sendCreated(res, vehicle, 'Vehicle added');
  } catch (e) { next(e); }
});

// POST /drivers/me/documents — driver uploads document URL
router.post('/me/documents', authorize('DRIVER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = z.object({
      type: z.enum(['DRIVING_LICENSE', 'INSURANCE', 'DBS_CHECK', 'VEHICLE_REGISTRATION', 'MOT_CERTIFICATE', 'PROFILE_PHOTO', 'VEHICLE_PHOTO']),
      fileUrl: z.string().url(),
      expiryDate: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
    }).parse(req.body);
    const doc = await driversService.saveDocumentRecord(req.tenantId, req.user.id, input.type, input.fileUrl, input.expiryDate);
    sendCreated(res, doc, 'Document uploaded');
  } catch (e) { next(e); }
});

// PATCH /drivers/documents/:id/verify — admin verifies document
router.patch('/documents/:id/verify', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = z.object({ approved: z.boolean(), rejectionReason: z.string().optional() }).parse(req.body);
    const doc = await driversService.verifyDocument(req.params.id, req.tenantId, req.user.id, input.approved, input.rejectionReason);
    sendSuccess(res, doc, input.approved ? 'Document approved' : 'Document rejected');
  } catch (e) { next(e); }
});

export default router;
