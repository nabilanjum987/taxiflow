// modules/promotions/promotions.service.ts
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { createModuleLogger } from '../../config/logger';
import { ERROR_CODES, HTTP_STATUS } from '@taxiflow/shared-constants';
import { buildPagination } from '@taxiflow/shared-utils';
import { ApiError } from '../../utils/ApiError';

const logger = createModuleLogger('promotions-service');

interface CreatePromoInput {
  tenantId: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minimumFare?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  validFrom: Date;
  validUntil: Date;
}

export async function createPromotion(input: CreatePromoInput) {
  if (input.validUntil <= input.validFrom) {
    throw new ApiError('End date must be after start date', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  const existing = await prisma.promotion.findUnique({
    where: { tenantId_code: { tenantId: input.tenantId, code: input.code.toUpperCase() } },
  });
  if (existing) throw new ApiError('Promo code already exists', HTTP_STATUS.CONFLICT, ERROR_CODES.VALIDATION_ERROR);

  return prisma.promotion.create({
    data: {
      id: uuidv4(),
      tenantId: input.tenantId,
      code: input.code.toUpperCase(),
      description: input.description,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minimumFare: input.minimumFare ?? null,
      maximumDiscount: input.maximumDiscount ?? null,
      usageLimit: input.usageLimit ?? null,
      perUserLimit: input.perUserLimit ?? null,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
    },
  });
}

export async function getPromotions(tenantId: string, page: number, limit: number) {
  const pagination = buildPagination(page, limit);
  const [promos, total] = await Promise.all([
    prisma.promotion.findMany({
      where: { tenantId },
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.promotion.count({ where: { tenantId } }),
  ]);
  return { promos, pagination: { ...pagination, total } };
}

export async function validatePromoCode(tenantId: string, code: string, fare: number) {
  const now = new Date();
  const promo = await prisma.promotion.findFirst({
    where: {
      tenantId,
      code: code.toUpperCase(),
      isActive: true,
      validFrom: { lte: now },
      validUntil: { gte: now },
    },
  });

  if (!promo) throw new ApiError('Invalid or expired promo code', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
    throw new ApiError('Promo code usage limit reached', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }
  if (promo.minimumFare !== null && fare < promo.minimumFare) {
    throw new ApiError(`Minimum fare of ${promo.minimumFare} required`, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  const discount = promo.discountType === 'PERCENTAGE'
    ? Math.min((fare * promo.discountValue) / 100, promo.maximumDiscount ?? Infinity)
    : promo.discountValue;

  return { valid: true, discount: Math.round(discount * 100) / 100, promo };
}

export async function togglePromotion(promoId: string, tenantId: string, isActive: boolean) {
  const promo = await prisma.promotion.findFirst({ where: { id: promoId, tenantId } });
  if (!promo) throw new ApiError('Promotion not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  return prisma.promotion.update({ where: { id: promoId }, data: { isActive } });
}
