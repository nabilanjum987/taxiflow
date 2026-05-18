// modules/webhooks/webhooks.routes.ts
// CRITICAL: Stripe requires raw body — do NOT use express.json() on this route
import { Router } from 'express';
import { handleStripeWebhook } from './stripe.webhook';

const router = Router();

// Raw body middleware — Stripe signature verification requires unparsed body
router.post(
  '/stripe',
  (req, res, next) => {
    // express.raw() applied per-route — not globally
    next();
  },
  handleStripeWebhook,
);

export default router;
