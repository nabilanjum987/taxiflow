// modules/ratings/ratings.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as ratingsService from './ratings.service';
import { authenticate, authorize } from '../../middleware/authMiddleware';
import { sendSuccess, sendCreated } from '../../utils/responseHelpers';

const router = Router();
router.use(authenticate);

router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = z.object({
      bookingId: z.string().uuid(),
      score: z.number().int().min(1).max(5),
      comment: z.string().max(500).optional(),
    }).parse(req.body);
    const rating = await ratingsService.submitRating(input.bookingId, req.tenantId, req.user.id, input.score, input.comment);
    sendCreated(res, rating, 'Rating submitted');
  } catch (e) { next(e); }
});

router.get('/drivers/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await ratingsService.getDriverRatings(req.params.id, req.tenantId, page, limit);
    sendSuccess(res, result);
  } catch (e) { next(e); }
});

export default router;
