// modules/pricing/pricing.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as pricingService from './pricing.service';
import { authenticate, authorize } from '../../middleware/authMiddleware';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/responseHelpers';

const router = Router();
router.use(authenticate);

const geoPointSchema = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) });

const pricingRuleSchema = z.object({
  zoneId: z.string().uuid().optional(),
  vehicleType: z.enum(['STANDARD', 'EXECUTIVE', 'MPV', 'WAV']),
  baseFare: z.number().positive(),
  perKmRate: z.number().positive(),
  perMinuteRate: z.number().positive(),
  minimumFare: z.number().positive(),
  bookingFee: z.number().min(0).optional(),
  nightMultiplier: z.number().min(1).max(5).optional(),
  nightStartHour: z.number().int().min(0).max(23).optional(),
  nightEndHour: z.number().int().min(0).max(23).optional(),
});

const zoneSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  polygon: z.array(geoPointSchema).min(3, 'Zone must have at least 3 points'),
});

const surgeSchema = z.object({
  zoneId: z.string().uuid().optional(),
  multiplier: z.number().min(1).max(5),
  reason: z.string().min(1).max(200),
  startTime: z.string().datetime().transform(v => new Date(v)),
  endTime: z.string().datetime().transform(v => new Date(v)),
});

// ─── PRICING RULES ────────────────────────────────────────

router.get('/rules', authorize('TENANT_ADMIN', 'DISPATCHER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rules = await pricingService.getPricingRules(req.tenantId);
    sendSuccess(res, rules);
  } catch (e) { next(e); }
});

router.post('/rules', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = pricingRuleSchema.parse(req.body);
    const rule = await pricingService.createPricingRule({ tenantId: req.tenantId, ...input });
    sendCreated(res, rule, 'Pricing rule created');
  } catch (e) { next(e); }
});

router.patch('/rules/:id', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = pricingRuleSchema.partial().parse(req.body);
    const rule = await pricingService.updatePricingRule(req.params.id, req.tenantId, input);
    sendSuccess(res, rule, 'Pricing rule updated');
  } catch (e) { next(e); }
});

router.delete('/rules/:id', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await pricingService.deletePricingRule(req.params.id, req.tenantId);
    sendNoContent(res);
  } catch (e) { next(e); }
});

// ─── ZONES ────────────────────────────────────────────────

router.get('/zones', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const zones = await pricingService.getZones(req.tenantId);
    sendSuccess(res, zones);
  } catch (e) { next(e); }
});

router.post('/zones', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = zoneSchema.parse(req.body);
    const zone = await pricingService.createZone({ tenantId: req.tenantId, ...input });
    sendCreated(res, zone, 'Zone created');
  } catch (e) { next(e); }
});

router.patch('/zones/:id', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = zoneSchema.partial().parse(req.body);
    const zone = await pricingService.updateZone(req.params.id, req.tenantId, input);
    sendSuccess(res, zone, 'Zone updated');
  } catch (e) { next(e); }
});

router.delete('/zones/:id', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await pricingService.deleteZone(req.params.id, req.tenantId);
    sendNoContent(res);
  } catch (e) { next(e); }
});

// ─── SURGE PRICING ────────────────────────────────────────

router.get('/surge', authorize('TENANT_ADMIN', 'DISPATCHER'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const activeOnly = req.query.active === 'true';
    const surge = await pricingService.getSurgePricing(req.tenantId, activeOnly);
    sendSuccess(res, surge);
  } catch (e) { next(e); }
});

router.post('/surge', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = surgeSchema.parse(req.body);
    const surge = await pricingService.createSurgePricing({ tenantId: req.tenantId, ...input });
    sendCreated(res, surge, 'Surge pricing created');
  } catch (e) { next(e); }
});

router.delete('/surge/:id', authorize('TENANT_ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await pricingService.deactivateSurge(req.params.id, req.tenantId);
    sendNoContent(res);
  } catch (e) { next(e); }
});

export default router;
