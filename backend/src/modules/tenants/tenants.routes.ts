// ============================================================
// modules/tenants/tenants.routes.ts
// ============================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as tenantsService from './tenants.service';
import { authenticate, authorize, superAdminOnly } from '../../middleware/authMiddleware';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/responseHelpers';
import { buildPagination } from '@taxiflow/shared-utils';
import type { ApiKeyProvider } from '@taxiflow/shared-types';

const router = Router();

// All tenant routes require authentication
router.use(authenticate);

// ─── TENANT ADMIN ROUTES ──────────────────────────────────

// GET /tenants/me — get current tenant info
router.get('/me', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenant = await tenantsService.getTenantById(req.tenantId);
    sendSuccess(res, tenant);
  } catch (e) { next(e); }
});

// PATCH /tenants/me/branding
const brandingSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

router.patch('/me/branding', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = brandingSchema.parse(req.body);
    const tenant = await tenantsService.updateTenantBranding(req.tenantId, input);
    sendSuccess(res, tenant, 'Branding updated');
  } catch (e) { next(e); }
});

// PATCH /tenants/me/settings
router.patch('/me/settings', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = await tenantsService.updateTenantSettings(req.tenantId, req.body);
    sendSuccess(res, settings, 'Settings updated');
  } catch (e) { next(e); }
});

// GET /tenants/me/api-keys — returns masked keys only, NEVER plain text
router.get('/me/api-keys', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const keys = await tenantsService.getApiKeyStatuses(req.tenantId);
    sendSuccess(res, keys);
  } catch (e) { next(e); }
});

// POST /tenants/me/api-keys — store encrypted API key
const apiKeySchema = z.object({
  provider: z.enum(['GOOGLE_MAPS', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'STRIPE_PUBLISHABLE', 'STRIPE_SECRET']),
  key: z.string().min(1, 'API key is required'),
});

router.post('/me/api-keys', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { provider, key } = apiKeySchema.parse(req.body);
    await tenantsService.storeApiKey(req.tenantId, provider as ApiKeyProvider, key);
    sendSuccess(res, null, 'API key saved securely');
  } catch (e) { next(e); }
});

// ─── SUPER ADMIN ROUTES ───────────────────────────────────

// GET /tenants — all tenants (super admin only)
router.get('/', superAdminOnly, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const { tenants, total } = await tenantsService.getAllTenants(page, limit);
    const pagination = buildPagination(page, limit, total);
    sendPaginated(res, tenants, pagination);
  } catch (e) { next(e); }
});

// POST /tenants/:id/suspend
router.post('/:id/suspend', superAdminOnly, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { reason } = z.object({ reason: z.string().min(1) }).parse(req.body);
    await tenantsService.suspendTenant(req.params.id, reason);
    sendSuccess(res, null, 'Tenant suspended');
  } catch (e) { next(e); }
});

// POST /tenants/:id/activate
router.post('/:id/activate', superAdminOnly, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await tenantsService.activateTenant(req.params.id);
    sendSuccess(res, null, 'Tenant activated');
  } catch (e) { next(e); }
});

export default router;
