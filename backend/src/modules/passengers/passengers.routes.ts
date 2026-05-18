// modules/passengers/passengers.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as passengersService from './passengers.service';
import { authenticate, authorize } from '../../middleware/authMiddleware';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/responseHelpers';

const router = Router();
router.use(authenticate);

const savedAddressSchema = z.object({
  label: z.string().min(1).max(50),
  fullAddress: z.string().min(1).max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// GET /passengers/me
router.get('/me', authorize('PASSENGER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await passengersService.getPassengerProfile(req.user.id, req.tenantId);
    sendSuccess(res, profile);
  } catch (e) { next(e); }
});

// PATCH /passengers/me
router.patch('/me', authorize('PASSENGER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = z.object({
      firstName: z.string().min(1).max(50).optional(),
      lastName: z.string().min(1).max(50).optional(),
      email: z.string().email().optional(),
      avatarUrl: z.string().url().optional(),
    }).parse(req.body);
    const profile = await passengersService.updatePassengerProfile(req.user.id, req.tenantId, input);
    sendSuccess(res, profile, 'Profile updated');
  } catch (e) { next(e); }
});

// POST /passengers/me/addresses
router.post('/me/addresses', authorize('PASSENGER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = savedAddressSchema.parse(req.body);
    const address = await passengersService.addSavedAddress(req.user.id, req.tenantId, input);
    sendCreated(res, address);
  } catch (e) { next(e); }
});

// DELETE /passengers/me/addresses/:id
router.delete('/me/addresses/:id', authorize('PASSENGER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await passengersService.deleteSavedAddress(req.params.id, req.user.id, req.tenantId);
    sendNoContent(res);
  } catch (e) { next(e); }
});

// GET /passengers — admin
router.get('/', authorize('TENANT_ADMIN', 'DISPATCHER', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;
    const result = await passengersService.getPassengers(req.tenantId, page, limit, search);
    sendPaginated(res, result.passengers, result.pagination);
  } catch (e) { next(e); }
});

export default router;
