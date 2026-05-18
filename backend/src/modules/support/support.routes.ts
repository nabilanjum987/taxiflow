// modules/support/support.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as supportService from './support.service';
import { authenticate, authorize } from '../../middleware/authMiddleware';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/responseHelpers';

const router = Router();
router.use(authenticate);

router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = z.object({
      subject: z.string().min(1).max(200),
      description: z.string().min(1).max(2000),
      bookingId: z.string().uuid().optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    }).parse(req.body);
    const ticket = await supportService.createTicket({ tenantId: req.tenantId, userId: req.user.id, ...input });
    sendCreated(res, ticket, 'Support ticket created');
  } catch (e) { next(e); }
});

router.get('/', authorize('TENANT_ADMIN', 'DISPATCHER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const result = await supportService.getTickets(req.tenantId, page, limit, status);
    sendPaginated(res, result.tickets, result.pagination);
  } catch (e) { next(e); }
});

router.patch('/:id/status', authorize('TENANT_ADMIN', 'DISPATCHER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, assignedTo } = z.object({
      status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
      assignedTo: z.string().optional(),
    }).parse(req.body);
    const ticket = await supportService.updateTicketStatus(req.params.id, req.tenantId, status, assignedTo);
    sendSuccess(res, ticket, 'Ticket updated');
  } catch (e) { next(e); }
});

export default router;
