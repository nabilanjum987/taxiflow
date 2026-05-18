// ============================================================
// modules/notifications/email.service.ts
// Production email via SendGrid
// All transactional emails: welcome, receipts, reminders, etc.
// ============================================================

import sgMail from '@sendgrid/mail';
import { env } from '../../config/env';
import { createModuleLogger } from '../../config/logger';

const logger = createModuleLogger('email-service');

if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
}

// ─── EMAIL TEMPLATES ──────────────────────────────────────
// In production: use SendGrid Dynamic Templates (IDs stored in env)
// In development: use plain HTML templates here

const TEMPLATES: Record<string, (vars: Record<string, string | number | boolean>) => { subject: string; html: string }> = {

  'onboarding-welcome': (v) => ({
    subject: `🎉 Welcome to TaxiFlow — ${v.companyName} is live!`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: 'DM Sans', Arial, sans-serif; background: #f9fafb; margin: 0; padding: 0; }
  .wrapper { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: #0f172a; padding: 32px 40px; text-align: center; }
  .logo { width: 48px; height: 48px; background: #f59e0b; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; }
  .body { padding: 40px; }
  .cred-box { background: #fef9c3; border: 2px solid #fcd34d; border-radius: 12px; padding: 20px; margin: 24px 0; }
  .cred-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fde68a; }
  .cred-row:last-child { border-bottom: none; }
  .cred-label { color: #92400e; font-size: 13px; font-weight: 600; }
  .cred-value { color: #1c1917; font-size: 13px; font-family: monospace; }
  .btn { display: inline-block; background: #f59e0b; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; margin: 8px 0; }
  .steps { background: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0; }
  .step { display: flex; gap: 12px; margin-bottom: 16px; align-items: flex-start; }
  .step-num { width: 28px; height: 28px; background: #f59e0b; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
  .footer { background: #f8fafc; padding: 24px 40px; text-align: center; }
  h1 { color: white; margin: 0; font-size: 22px; }
  h2 { color: #111827; font-size: 20px; margin-top: 0; }
  p { color: #374151; line-height: 1.6; }
  .warning { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; color: #991b1b; font-size: 13px; margin-top: 16px; }
</style></head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="logo">🚖</div>
    <h1>Welcome to TaxiFlow!</h1>
    <p style="color:#94a3b8;margin:8px 0 0;">Your platform is ready</p>
  </div>
  <div class="body">
    <h2>Hi ${v.firstName},</h2>
    <p>Congratulations! Your <strong>${v.companyName}</strong> taxi platform is live and ready to take bookings. Here are your login credentials:</p>

    <div class="cred-box">
      <div class="cred-row">
        <span class="cred-label">Admin Panel</span>
        <span class="cred-value">${v.adminPanelUrl}</span>
      </div>
      <div class="cred-row">
        <span class="cred-label">Tenant ID</span>
        <span class="cred-value">${v.tenantId}</span>
      </div>
      <div class="cred-row">
        <span class="cred-label">Email</span>
        <span class="cred-value">${v.adminEmail}</span>
      </div>
      <div class="cred-row">
        <span class="cred-label">Temp Password</span>
        <span class="cred-value">${v.temporaryPassword}</span>
      </div>
      <div class="cred-row">
        <span class="cred-label">Plan</span>
        <span class="cred-value">${v.planName} — ${v.billingAmount}</span>
      </div>
    </div>

    <div class="warning">⚠️ Change your password after first login. Never share these credentials.</div>

    <div style="text-align:center;margin:28px 0;">
      <a href="${v.adminPanelUrl}" class="btn">Open Admin Panel →</a>
    </div>

    <div class="steps">
      <p style="font-weight:700;margin:0 0 16px;">Next steps to go live:</p>
      <div class="step">
        <div class="step-num">1</div>
        <div><strong>Log in</strong> and change your password</div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div><strong>Add your API keys</strong> — Google Maps, Stripe, Twilio in Settings</div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div><strong>Configure pricing</strong> — set your fare rules for each vehicle type</div>
      </div>
      <div class="step">
        <div class="step-num">4</div>
        <div><strong>Add your first driver</strong> — approve their documents</div>
      </div>
      <div class="step">
        <div class="step-num">5</div>
        <div><strong>Test a booking</strong> — create a test ride end-to-end</div>
      </div>
    </div>

    <p>Need help? Email us at <a href="mailto:${v.supportEmail}">${v.supportEmail}</a> — we respond within 2 hours.</p>
  </div>
  <div class="footer">
    <p style="color:#6b7280;font-size:12px;margin:0;">TaxiFlow · White-Label Taxi SaaS · <a href="mailto:${v.supportEmail}">support@taxiflow.com</a></p>
  </div>
</div>
</body></html>`,
  }),

  'subscription-renewed': (v) => ({
    subject: `TaxiFlow receipt — ${v.amount} charged`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body{font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;}
  .card{max-width:480px;margin:0 auto;background:white;border-radius:12px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06);}
  .amount{font-size:36px;font-weight:800;color:#111827;margin:16px 0;}
  .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;}
</style></head><body>
<div class="card">
  <p style="color:#6b7280;margin:0;">TaxiFlow Receipt</p>
  <div class="amount">${v.amount}</div>
  <div class="row"><span style="color:#6b7280">Plan</span><span>${v.planName}</span></div>
  <div class="row"><span style="color:#6b7280">Company</span><span>${v.companyName}</span></div>
  <div class="row"><span style="color:#6b7280">Next billing</span><span>${v.nextBillingDate}</span></div>
  <p style="color:#6b7280;font-size:13px;margin-top:24px;">Hi ${v.firstName}, your TaxiFlow subscription has been renewed. Thank you for your continued business!</p>
</div>
</body></html>`,
  }),

  'payment-failed': (v) => ({
    subject: '⚠️ Action required — TaxiFlow payment failed',
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#f9fafb;padding:20px;">
<div style="max-width:480px;margin:0 auto;background:white;border-radius:12px;padding:32px;">
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:24px;">
    <strong style="color:#991b1b">⚠️ Payment Failed</strong>
  </div>
  <p>Hi ${v.firstName},</p>
  <p>We were unable to charge your payment method for your <strong>${v.companyName}</strong> TaxiFlow subscription.</p>
  <p>Please update your payment details to keep your platform running.</p>
  <a href="${v.updatePaymentUrl}" style="display:inline-block;background:#ef4444;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0;">Update Payment Method</a>
  <p style="color:#6b7280;font-size:13px;">Questions? Contact us at ${v.supportEmail}</p>
</div>
</body></html>`,
  }),

  'ride-receipt': (v) => ({
    subject: `Your TaxiFlow ride receipt — £${v.fare}`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#f9fafb;padding:20px;">
<div style="max-width:400px;margin:0 auto;background:white;border-radius:12px;padding:28px;">
  <p style="color:#6b7280;font-size:12px;margin:0;">RIDE RECEIPT</p>
  <p style="font-size:28px;font-weight:800;color:#111827;margin:8px 0;">${v.currency} ${v.fare}</p>
  <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;">
    <div style="font-size:13px;color:#6b7280;margin-bottom:4px;">Pickup</div>
    <div style="font-size:14px;color:#111827;">${v.pickup}</div>
    <div style="font-size:13px;color:#6b7280;margin:12px 0 4px;">Drop-off</div>
    <div style="font-size:14px;color:#111827;">${v.dropoff}</div>
  </div>
  <div style="font-size:12px;color:#9ca3af;text-align:center;">Booking #${v.bookingId} · Thank you for riding with us</div>
</div>
</body></html>`,
  }),

  'driver-approved': (v) => ({
    subject: '🎉 You\'re approved — Start driving today!',
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#f9fafb;padding:20px;">
<div style="max-width:480px;margin:0 auto;background:white;border-radius:12px;padding:32px;">
  <h2>Hi ${v.firstName}! 🎉</h2>
  <p>Your driver application has been <strong style="color:#10b981">approved</strong>! You can now go online and start accepting bookings.</p>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
    <p style="margin:0;font-weight:600;color:#15803d;">Next steps:</p>
    <ol style="color:#166534;margin:8px 0 0;">
      <li>Open the Driver App</li>
      <li>Log in with your phone number</li>
      <li>Tap "Go Online" to start receiving bookings</li>
    </ol>
  </div>
  <p style="color:#6b7280;font-size:13px;">Good luck and drive safe! 🚗</p>
</div>
</body></html>`,
  }),

  'driver-rejected': (v) => ({
    subject: 'Update on your driver application',
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#f9fafb;padding:20px;">
<div style="max-width:480px;margin:0 auto;background:white;border-radius:12px;padding:32px;">
  <h2>Hi ${v.firstName},</h2>
  <p>Unfortunately, we were unable to approve your driver application at this time.</p>
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;">
    <strong style="color:#991b1b">Reason:</strong>
    <p style="color:#7f1d1d;margin:4px 0 0;">${v.reason}</p>
  </div>
  <p>If you believe this is an error or would like to reapply, please contact support.</p>
</div>
</body></html>`,
  }),

  'setup-reminder': (v) => ({
    subject: `${v.companyName} — complete your TaxiFlow setup in 3 steps`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#f9fafb;padding:20px;">
<div style="max-width:480px;margin:0 auto;background:white;border-radius:12px;padding:32px;">
  <h2>Hi ${v.firstName} 👋</h2>
  <p>Your TaxiFlow platform is set up but not fully configured yet. Here's what's remaining:</p>
  <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:20px;margin:20px 0;">
    <p style="margin:0 0 12px;font-weight:700;">Complete these steps to go live:</p>
    <p>☐ Add your Google Maps API key (required for mapping)</p>
    <p>☐ Configure your Stripe keys (required for payments)</p>
    <p style="margin:0;">☐ Set up fare pricing rules</p>
  </div>
  <a href="${v.adminPanelUrl}/settings" style="display:inline-block;background:#f59e0b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Complete Setup →</a>
</div>
</body></html>`,
  }),

  'churn-prevention': (v) => ({
    subject: `We're sad to see you go, ${v.firstName}`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#f9fafb;padding:20px;">
<div style="max-width:480px;margin:0 auto;background:white;border-radius:12px;padding:32px;">
  <h2>Hi ${v.firstName},</h2>
  <p>We noticed you've cancelled your <strong>${v.companyName}</strong> TaxiFlow subscription.</p>
  <p>We'd love to understand what went wrong. If there's anything we can do to help — whether it's a feature, pricing, or support — please reach out.</p>
  <p>We're always looking to improve and your feedback matters to us.</p>
  <a href="mailto:${v.supportEmail}?subject=Feedback from ${v.companyName}" style="display:inline-block;background:#0f172a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0;">Share Your Feedback</a>
</div>
</body></html>`,
  }),

  'payment-confirmed': (v) => ({
    subject: `Payment confirmed — £${v.amount} received`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#f9fafb;padding:20px;">
<div style="max-width:400px;margin:0 auto;background:white;border-radius:12px;padding:28px;">
  <div style="text-align:center;margin-bottom:20px;">
    <div style="width:48px;height:48px;background:#f0fdf4;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:24px;">✅</div>
  </div>
  <p>Hi ${v.firstName},</p>
  <p>Payment of <strong>${v.currency} ${v.amount}</strong> confirmed for booking #<strong>${v.bookingId}</strong>.</p>
  <p style="color:#6b7280;font-size:13px;">Thank you for riding with us!</p>
</div>
</body></html>`,
  }),
};

// ─── SEND EMAIL ───────────────────────────────────────────

export interface SendEmailInput {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, string | number | boolean>;
  tenantId?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const { to, template, variables } = input;

  const templateFn = TEMPLATES[template];
  if (!templateFn) {
    logger.warn('Email template not found', { template });
    return;
  }

  const { subject, html } = templateFn(variables);

  if (!env.SENDGRID_API_KEY) {
    // Dev mode — just log
    logger.info(`📧 [DEV] Email: ${to} | ${subject}`);
    return;
  }

  try {
    await sgMail.send({
      to,
      from: { email: env.EMAIL_FROM, name: env.EMAIL_FROM_NAME },
      subject,
      html,
    });

    logger.info('Email sent', { to: to.replace(/(.{2}).*@/, '$1***@'), subject: subject.slice(0, 50) });
  } catch (error) {
    logger.error('SendGrid error', { error, to: to.replace(/(.{2}).*@/, '$1***@'), template });
    throw error;
  }
}
