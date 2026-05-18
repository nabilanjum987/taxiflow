// modules/onboarding/onboarding.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { runOnboarding, sendSetupReminder } from './onboarding.service';
import { superAdminOnly } from '../../middleware/authMiddleware';
import { sendSuccess, sendCreated } from '../../utils/responseHelpers';
import { createModuleLogger } from '../../config/logger';

const logger = createModuleLogger('onboarding-routes');
const router = Router();

// POST /onboarding/manual — Super admin manually creates a tenant
// (used when client pays via invoice not Stripe)
router.post(
  '/manual',
  superAdminOnly,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = z.object({
        companyName: z.string().min(1).max(100),
        adminEmail: z.string().email(),
        adminPhone: z.string().min(7),
        adminFirstName: z.string().min(1).max(50),
        adminLastName: z.string().min(1).max(50),
        country: z.string().length(2).default('GB'),
        currency: z.string().length(3).default('GBP'),
        timezone: z.string().default('Europe/London'),
        planSlug: z.enum(['starter', 'business', 'pro', 'enterprise']),
        stripeCustomerId: z.string().default('manual'),
        stripeSubscriptionId: z.string().default('manual'),
      }).parse(req.body);

      const result = await runOnboarding(input);

      logger.info('Manual onboarding completed', {
        tenantId: result.tenantId,
        adminEmail: result.adminEmail,
        byAdmin: req.user.id,
      });

      sendCreated(res, {
        tenantId: result.tenantId,
        slug: result.slug,
        adminPanelUrl: result.adminPanelUrl,
        message: 'Tenant created and welcome email sent',
      });
    } catch (e) { next(e); }
  },
);

// POST /onboarding/resend-welcome — Resend welcome email
router.post(
  '/resend-welcome/:tenantId',
  superAdminOnly,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await sendSetupReminder(req.params.tenantId);
      sendSuccess(res, null, 'Setup reminder sent');
    } catch (e) { next(e); }
  },
);

export default router;
