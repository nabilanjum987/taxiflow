// modules/notifications/notifications.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import * as notificationsService from './notifications.service';
import { authenticate } from '../../middleware/authMiddleware';
import { sendSuccess, sendPaginated } from '../../utils/responseHelpers';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unread === 'true';
    const result = await notificationsService.getUserNotifications(req.user.id, req.tenantId, page, limit, unreadOnly);
    sendPaginated(res, result.notifications, result.pagination);
  } catch (e) { next(e); }
});

router.get('/unread-count', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const count = await notificationsService.getUnreadCount(req.user.id, req.tenantId);
    sendSuccess(res, count);
  } catch (e) { next(e); }
});

router.patch('/:id/read', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notification = await notificationsService.markAsRead(req.params.id, req.user.id, req.tenantId);
    sendSuccess(res, notification);
  } catch (e) { next(e); }
});

router.patch('/read-all', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await notificationsService.markAllAsRead(req.user.id, req.tenantId);
    sendSuccess(res, result, 'All notifications marked as read');
  } catch (e) { next(e); }
});

export default router;
