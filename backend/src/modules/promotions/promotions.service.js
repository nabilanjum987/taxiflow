"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPromotion = createPromotion;
exports.getPromotions = getPromotions;
exports.validatePromoCode = validatePromoCode;
exports.togglePromotion = togglePromotion;
// modules/promotions/promotions.service.ts
const uuid_1 = require("uuid");
const database_1 = require("../../config/database");
const logger_1 = require("../../config/logger");
const shared_constants_1 = require("@taxiflow/shared-constants");
const shared_utils_1 = require("@taxiflow/shared-utils");
const ApiError_1 = require("../../utils/ApiError");
const logger = (0, logger_1.createModuleLogger)('promotions-service');
async function createPromotion(input) {
    if (input.validUntil <= input.validFrom) {
        throw new ApiError_1.ApiError('End date must be after start date', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    const existing = await database_1.prisma.promotion.findUnique({
        where: { tenantId_code: { tenantId: input.tenantId, code: input.code.toUpperCase() } },
    });
    if (existing)
        throw new ApiError_1.ApiError('Promo code already exists', shared_constants_1.HTTP_STATUS.CONFLICT, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    return database_1.prisma.promotion.create({
        data: {
            id: (0, uuid_1.v4)(),
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
async function getPromotions(tenantId, page, limit) {
    const pagination = (0, shared_utils_1.buildPagination)(page, limit);
    const [promos, total] = await Promise.all([
        database_1.prisma.promotion.findMany({
            where: { tenantId },
            skip: pagination.skip,
            take: pagination.limit,
            orderBy: { createdAt: 'desc' },
        }),
        database_1.prisma.promotion.count({ where: { tenantId } }),
    ]);
    return { promos, pagination: { ...pagination, total } };
}
async function validatePromoCode(tenantId, code, fare) {
    const now = new Date();
    const promo = await database_1.prisma.promotion.findFirst({
        where: {
            tenantId,
            code: code.toUpperCase(),
            isActive: true,
            validFrom: { lte: now },
            validUntil: { gte: now },
        },
    });
    if (!promo)
        throw new ApiError_1.ApiError('Invalid or expired promo code', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
        throw new ApiError_1.ApiError('Promo code usage limit reached', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    if (promo.minimumFare !== null && fare < promo.minimumFare) {
        throw new ApiError_1.ApiError(`Minimum fare of ${promo.minimumFare} required`, shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    const discount = promo.discountType === 'PERCENTAGE'
        ? Math.min((fare * promo.discountValue) / 100, promo.maximumDiscount ?? Infinity)
        : promo.discountValue;
    return { valid: true, discount: Math.round(discount * 100) / 100, promo };
}
async function togglePromotion(promoId, tenantId, isActive) {
    const promo = await database_1.prisma.promotion.findFirst({ where: { id: promoId, tenantId } });
    if (!promo)
        throw new ApiError_1.ApiError('Promotion not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.NOT_FOUND);
    return database_1.prisma.promotion.update({ where: { id: promoId }, data: { isActive } });
}
//# sourceMappingURL=promotions.service.js.map