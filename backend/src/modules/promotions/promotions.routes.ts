// modules/promotions/promotions.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as promotionsService from './promotions.service';
import { authenticate, authorize } from '../../middleware/authMiddleware';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/responseHelpers';

const router = Router();
router.use(authenticate);

const promoSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  description: z.string().min(1).max(200),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  discountValue: z.number().positive(),
  minimumFare: z.number().positive().optional(),
  maximumDiscount: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().optional(),
  validFrom: z.string().datetime().transform(v => new Date(v)),
  validUntil: z.string().datetime().transform(v => new Date(v)),
});

router.get('/', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await promotionsService.getPromotions(req.tenantId, page, limit);
    sendPaginated(res, result.promos, result.pagination);
  } catch (e) { next(e); }
});

router.post('/', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = promoSchema.parse(req.body);
    const promo = await promotionsService.createPromotion({ tenantId: req.tenantId, ...input });
    sendCreated(res, promo, 'Promo code created');
  } catch (e) { next(e); }
});

// GET /promotions/validate?code=SAVE10&fare=25 — passenger validates before booking
router.get('/validate', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, fare } = z.object({
      code: z.string().min(1),
      fare: z.string().transform(Number),
    }).parse(req.query);
    const result = await promotionsService.validatePromoCode(req.tenantId, code, fare);
    sendSuccess(res, result);
  } catch (e) { next(e); }
});

router.patch('/:id/toggle', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const promo = await promotionsService.togglePromotion(req.params.id, req.tenantId, isActive);
    sendSuccess(res, promo);
  } catch (e) { next(e); }
});

export default router;
