// modules/payments/payments.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as paymentsService from './payments.service';
import { authenticate, authorize } from '../../middleware/authMiddleware';
import { sendSuccess, sendPaginated } from '../../utils/responseHelpers';

const router = Router();
router.use(authenticate);

// POST /payments/intent — passenger initiates card payment
router.post('/intent', authorize('PASSENGER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bookingId } = z.object({ bookingId: z.string().uuid() }).parse(req.body);
    const result = await paymentsService.createPaymentIntent(bookingId, req.tenantId);
    sendSuccess(res, result);
  } catch (e) { next(e); }
});

// POST /payments/confirm
router.post('/confirm', authorize('PASSENGER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = z.object({
      bookingId: z.string().uuid(),
      stripePaymentIntentId: z.string().min(1),
    }).parse(req.body);
    const payment = await paymentsService.confirmPayment(input.bookingId, req.tenantId, input.stripePaymentIntentId);
    sendSuccess(res, payment, 'Payment confirmed');
  } catch (e) { next(e); }
});

// POST /payments/:bookingId/refund — admin refunds
router.post('/:bookingId/refund', authorize('TENANT_ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = z.object({
      reason: z.string().min(1),
      amount: z.number().positive().optional(),
    }).parse(req.body);
    const payment = await paymentsService.refundPayment(req.params.bookingId, req.tenantId, input.reason, input.amount);
    sendSuccess(res, payment, 'Refund processed');
  } catch (e) { next(e); }
});

// GET /payments/history
router.get('/history', authorize('TENANT_ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await paymentsService.getPaymentHistory(req.tenantId, page, limit);
    sendPaginated(res, result.payments, result.pagination);
  } catch (e) { next(e); }
});

// POST /payments/payout — admin triggers driver payout
router.post('/payout', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = z.object({
      driverId: z.string().uuid(),
      periodStart: z.string().datetime().transform(v => new Date(v)),
      periodEnd: z.string().datetime().transform(v => new Date(v)),
    }).parse(req.body);
    const payout = await paymentsService.processDriverPayout(input.driverId, req.tenantId, input.periodStart, input.periodEnd);
    sendSuccess(res, payout, 'Payout processed');
  } catch (e) { next(e); }
});

export default router;
