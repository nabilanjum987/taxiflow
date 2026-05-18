// modules/pricing/pricing.service.ts
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { cacheDel } from '../../config/redis';
import { createModuleLogger } from '../../config/logger';
import { ERROR_CODES, HTTP_STATUS } from '@taxiflow/shared-constants';
import { ApiError } from '../../utils/ApiError';
import type { VehicleType } from '@taxiflow/shared-types';

const logger = createModuleLogger('pricing-service');

// ─── PRICING RULES ────────────────────────────────────────

interface CreatePricingRuleInput {
  tenantId: string;
  zoneId?: string;
  vehicleType: VehicleType;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
  bookingFee?: number;
  nightMultiplier?: number;
  nightStartHour?: number;
  nightEndHour?: number;
}

export async function createPricingRule(input: CreatePricingRuleInput) {
  const existing = await prisma.pricingRule.findFirst({
    where: { tenantId: input.tenantId, zoneId: input.zoneId ?? null, vehicleType: input.vehicleType, isActive: true },
  });

  if (existing) {
    throw new ApiError(
      `Pricing rule for ${input.vehicleType} already exists${input.zoneId ? ' in this zone' : ''}. Update the existing rule instead.`,
      HTTP_STATUS.CONFLICT, ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const rule = await prisma.pricingRule.create({
    data: {
      id: uuidv4(),
      tenantId: input.tenantId,
      zoneId: input.zoneId ?? null,
      vehicleType: input.vehicleType,
      baseFare: input.baseFare,
      perKmRate: input.perKmRate,
      perMinuteRate: input.perMinuteRate,
      minimumFare: input.minimumFare,
      bookingFee: input.bookingFee ?? 0,
      nightMultiplier: input.nightMultiplier ?? 1.5,
      nightStartHour: input.nightStartHour ?? 22,
      nightEndHour: input.nightEndHour ?? 6,
    },
  });

  logger.info('Pricing rule created', { ruleId: rule.id, tenantId: input.tenantId });
  return rule;
}

export async function updatePricingRule(
  ruleId: string,
  tenantId: string,
  data: Partial<Omit<CreatePricingRuleInput, 'tenantId'>>,
) {
  const rule = await prisma.pricingRule.findFirst({ where: { id: ruleId, tenantId } });
  if (!rule) throw new ApiError('Pricing rule not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);

  return prisma.pricingRule.update({ where: { id: ruleId }, data });
}

export async function getPricingRules(tenantId: string) {
  return prisma.pricingRule.findMany({
    where: { tenantId, isActive: true },
    include: { zone: { select: { id: true, name: true } } },
    orderBy: [{ zoneId: 'asc' }, { vehicleType: 'asc' }],
  });
}

export async function deletePricingRule(ruleId: string, tenantId: string) {
  const rule = await prisma.pricingRule.findFirst({ where: { id: ruleId, tenantId } });
  if (!rule) throw new ApiError('Pricing rule not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);

  await prisma.pricingRule.update({ where: { id: ruleId }, data: { isActive: false } });
}

// ─── ZONES ────────────────────────────────────────────────

interface CreateZoneInput {
  tenantId: string;
  name: string;
  description?: string;
  polygon: Array<{ latitude: number; longitude: number }>;
}

export async function createZone(input: CreateZoneInput) {
  return prisma.zone.create({
    data: {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description ?? null,
      polygon: input.polygon,
    },
  });
}

export async function getZones(tenantId: string) {
  return prisma.zone.findMany({
    where: { tenantId, isActive: true },
    include: { pricingRules: { where: { isActive: true } } },
  });
}

export async function updateZone(
  zoneId: string,
  tenantId: string,
  data: { name?: string; description?: string; polygon?: Array<{ latitude: number; longitude: number }> },
) {
  const zone = await prisma.zone.findFirst({ where: { id: zoneId, tenantId } });
  if (!zone) throw new ApiError('Zone not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  return prisma.zone.update({ where: { id: zoneId }, data });
}

export async function deleteZone(zoneId: string, tenantId: string) {
  const zone = await prisma.zone.findFirst({ where: { id: zoneId, tenantId } });
  if (!zone) throw new ApiError('Zone not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  await prisma.zone.update({ where: { id: zoneId }, data: { isActive: false } });
}

// ─── SURGE PRICING ────────────────────────────────────────

interface CreateSurgeInput {
  tenantId: string;
  zoneId?: string;
  multiplier: number;
  reason: string;
  startTime: Date;
  endTime: Date;
}

export async function createSurgePricing(input: CreateSurgeInput) {
  if (input.multiplier < 1 || input.multiplier > 5) {
    throw new ApiError('Surge multiplier must be between 1 and 5', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  if (input.endTime <= input.startTime) {
    throw new ApiError('End time must be after start time', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  return prisma.surgePricing.create({
    data: {
      id: uuidv4(),
      tenantId: input.tenantId,
      zoneId: input.zoneId ?? null,
      multiplier: input.multiplier,
      reason: input.reason,
      startTime: input.startTime,
      endTime: input.endTime,
    },
  });
}

export async function getSurgePricing(tenantId: string, activeOnly = false) {
  return prisma.surgePricing.findMany({
    where: {
      tenantId,
      ...(activeOnly && { isActive: true, startTime: { lte: new Date() }, endTime: { gte: new Date() } }),
    },
    include: { zone: { select: { id: true, name: true } } },
    orderBy: { startTime: 'desc' },
  });
}

export async function deactivateSurge(surgeId: string, tenantId: string) {
  const surge = await prisma.surgePricing.findFirst({ where: { id: surgeId, tenantId } });
  if (!surge) throw new ApiError('Surge not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  return prisma.surgePricing.update({ where: { id: surgeId }, data: { isActive: false } });
}
