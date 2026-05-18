"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// modules/webhooks/webhooks.routes.ts
// CRITICAL: Stripe requires raw body — do NOT use express.json() on this route
const express_1 = require("express");
const stripe_webhook_1 = require("./stripe.webhook");
const router = (0, express_1.Router)();
// Raw body middleware — Stripe signature verification requires unparsed body
router.post('/stripe', (req, res, next) => {
    // express.raw() applied per-route — not globally
    next();
}, stripe_webhook_1.handleStripeWebhook);
exports.default = router;
//# sourceMappingURL=webhooks.routes.js.map