// modules/reports/reports.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import * as reportsService from './reports.service';
import { authenticate, authorize } from '../../middleware/authMiddleware';
import { sendSuccess } from '../../utils/responseHelpers';

const router = Router();
router.use(authenticate);
router.use(authorize('TENANT_ADMIN', 'DISPATCHER', 'SUPER_ADMIN'));

router.get('/dashboard', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await reportsService.getDashboardStats(req.tenantId);
    sendSuccess(res, stats);
  } catch (e) { next(e); }
});

router.get('/revenue', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const report = await reportsService.getRevenueReport(req.tenantId, days);
    sendSuccess(res, report);
  } catch (e) { next(e); }
});

router.get('/bookings', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const report = await reportsService.getBookingReport(req.tenantId, days);
    sendSuccess(res, report);
  } catch (e) { next(e); }
});

export default router;
