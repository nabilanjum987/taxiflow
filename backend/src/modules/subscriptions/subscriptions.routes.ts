// modules/subscriptions/subscriptions.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as subscriptionsService from './subscriptions.service';
import { authenticate, authorize, superAdminOnly } from '../../middleware/authMiddleware';
import { sendSuccess, sendCreated } from '../../utils/responseHelpers';

const router = Router();

// Public — create checkout session (called from landing page)
router.post('/checkout', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = z.object({
      planSlug: z.enum(['starter', 'business', 'pro', 'enterprise']),
      companyName: z.string().min(1).max(100),
      adminEmail: z.string().email(),
      adminPhone: z.string().min(7),
      adminFirstName: z.string().min(1).max(50),
      adminLastName: z.string().min(1).max(50),
      country: z.string().length(2).default('GB'),
      currency: z.string().length(3).default('GBP'),
      timezone: z.string().default('Europe/London'),
      successUrl: z.string().url(),
      cancelUrl: z.string().url(),
    }).parse(req.body);

    const result = await subscriptionsService.createCheckoutSession(input);
    sendSuccess(res, result);
  } catch (e) { next(e); }
});

// GET /subscriptions/plans — list all plans (public)
router.get('/plans', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const plans = await subscriptionsService.getAvailablePlans();
    sendSuccess(res, plans);
  } catch (e) { next(e); }
});

// All routes below require authentication
router.use(authenticate);

// GET /subscriptions/status — tenant's current subscription
router.get('/status', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = await subscriptionsService.getSubscriptionStatus(req.tenantId);
    sendSuccess(res, status);
  } catch (e) { next(e); }
});

// GET /subscriptions/billing-portal — redirect to Stripe billing portal
router.get('/billing-portal', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const returnUrl = req.query.returnUrl as string ?? `${process.env.ADMIN_PANEL_URL}/settings`;
    const url = await subscriptionsService.createCustomerPortalSession(req.tenantId, returnUrl);
    sendSuccess(res, { url });
  } catch (e) { next(e); }
});

// POST /subscriptions/change-plan
router.post('/change-plan', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { planSlug } = z.object({ planSlug: z.enum(['starter', 'business', 'pro', 'enterprise']) }).parse(req.body);
    await subscriptionsService.changePlan(req.tenantId, planSlug);
    sendSuccess(res, null, 'Plan changed successfully');
  } catch (e) { next(e); }
});

// POST /subscriptions/cancel
router.post('/cancel', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { cancelImmediately } = z.object({ cancelImmediately: z.boolean().default(false) }).parse(req.body);
    await subscriptionsService.cancelSubscription(req.tenantId, cancelImmediately);
    sendSuccess(res, null, cancelImmediately ? 'Subscription cancelled' : 'Subscription will cancel at end of billing period');
  } catch (e) { next(e); }
});

export default router;
