"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPricingRule = createPricingRule;
exports.updatePricingRule = updatePricingRule;
exports.getPricingRules = getPricingRules;
exports.deletePricingRule = deletePricingRule;
exports.createZone = createZone;
exports.getZones = getZones;
exports.updateZone = updateZone;
exports.deleteZone = deleteZone;
exports.createSurgePricing = createSurgePricing;
exports.getSurgePricing = getSurgePricing;
exports.deactivateSurge = deactivateSurge;
// modules/pricing/pricing.service.ts
const uuid_1 = require("uuid");
const database_1 = require("../../config/database");
const logger_1 = require("../../config/logger");
const shared_constants_1 = require("@taxiflow/shared-constants");
const ApiError_1 = require("../../utils/ApiError");
const logger = (0, logger_1.createModuleLogger)('pricing-service');
async function createPricingRule(input) {
    const existing = await database_1.prisma.pricingRule.findFirst({
        where: { tenantId: input.tenantId, zoneId: input.zoneId ?? null, vehicleType: input.vehicleType, isActive: true },
    });
    if (existing) {
        throw new ApiError_1.ApiError(`Pricing rule for ${input.vehicleType} already exists${input.zoneId ? ' in this zone' : ''}. Update the existing rule instead.`, shared_constants_1.HTTP_STATUS.CONFLICT, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    const rule = await database_1.prisma.pricingRule.create({
        data: {
            id: (0, uuid_1.v4)(),
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
async function updatePricingRule(ruleId, tenantId, data) {
    const rule = await database_1.prisma.pricingRule.findFirst({ where: { id: ruleId, tenantId } });
    if (!rule)
        throw new ApiError_1.ApiError('Pricing rule not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.NOT_FOUND);
    return database_1.prisma.pricingRule.update({ where: { id: ruleId }, data });
}
async function getPricingRules(tenantId) {
    return database_1.prisma.pricingRule.findMany({
        where: { tenantId, isActive: true },
        include: { zone: { select: { id: true, name: true } } },
        orderBy: [{ zoneId: 'asc' }, { vehicleType: 'asc' }],
    });
}
async function deletePricingRule(ruleId, tenantId) {
    const rule = await database_1.prisma.pricingRule.findFirst({ where: { id: ruleId, tenantId } });
    if (!rule)
        throw new ApiError_1.ApiError('Pricing rule not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.NOT_FOUND);
    await database_1.prisma.pricingRule.update({ where: { id: ruleId }, data: { isActive: false } });
}
async function createZone(input) {
    return database_1.prisma.zone.create({
        data: {
            id: (0, uuid_1.v4)(),
            tenantId: input.tenantId,
            name: input.name,
            description: input.description ?? null,
            polygon: input.polygon,
        },
    });
}
async function getZones(tenantId) {
    return database_1.prisma.zone.findMany({
        where: { tenantId, isActive: true },
        include: { pricingRules: { where: { isActive: true } } },
    });
}
async function updateZone(zoneId, tenantId, data) {
    const zone = await database_1.prisma.zone.findFirst({ where: { id: zoneId, tenantId } });
    if (!zone)
        throw new ApiError_1.ApiError('Zone not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.NOT_FOUND);
    return database_1.prisma.zone.update({ where: { id: zoneId }, data });
}
async function deleteZone(zoneId, tenantId) {
    const zone = await database_1.prisma.zone.findFirst({ where: { id: zoneId, tenantId } });
    if (!zone)
        throw new ApiError_1.ApiError('Zone not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.NOT_FOUND);
    await database_1.prisma.zone.update({ where: { id: zoneId }, data: { isActive: false } });
}
async function createSurgePricing(input) {
    if (input.multiplier < 1 || input.multiplier > 5) {
        throw new ApiError_1.ApiError('Surge multiplier must be between 1 and 5', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    if (input.endTime <= input.startTime) {
        throw new ApiError_1.ApiError('End time must be after start time', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    return database_1.prisma.surgePricing.create({
        data: {
            id: (0, uuid_1.v4)(),
            tenantId: input.tenantId,
            zoneId: input.zoneId ?? null,
            multiplier: input.multiplier,
            reason: input.reason,
            startTime: input.startTime,
            endTime: input.endTime,
        },
    });
}
async function getSurgePricing(tenantId, activeOnly = false) {
    return database_1.prisma.surgePricing.findMany({
        where: {
            tenantId,
            ...(activeOnly && { isActive: true, startTime: { lte: new Date() }, endTime: { gte: new Date() } }),
        },
        include: { zone: { select: { id: true, name: true } } },
        orderBy: { startTime: 'desc' },
    });
}
async function deactivateSurge(surgeId, tenantId) {
    const surge = await database_1.prisma.surgePricing.findFirst({ where: { id: surgeId, tenantId } });
    if (!surge)
        throw new ApiError_1.ApiError('Surge not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.NOT_FOUND);
    return database_1.prisma.surgePricing.update({ where: { id: surgeId }, data: { isActive: false } });
}
//# sourceMappingURL=pricing.service.js.map