"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitRating = submitRating;
exports.getDriverRatings = getDriverRatings;
// modules/ratings/ratings.service.ts
const uuid_1 = require("uuid");
const database_1 = require("../../config/database");
const logger_1 = require("../../config/logger");
const shared_constants_1 = require("@taxiflow/shared-constants");
const ApiError_1 = require("../../utils/ApiError");
const logger = (0, logger_1.createModuleLogger)('ratings-service');
async function submitRating(bookingId, tenantId, ratedByUserId, score, comment) {
    const booking = await database_1.prisma.booking.findFirst({
        where: { id: bookingId, tenantId, status: 'COMPLETED' },
        include: {
            passenger: { select: { userId: true, id: true } },
            driver: { select: { userId: true, id: true } },
        },
    });
    if (!booking)
        throw new ApiError_1.ApiError('Completed booking not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.BOOKING_NOT_FOUND);
    const isPassenger = booking.passenger.userId === ratedByUserId;
    const isDriver = booking.driver?.userId === ratedByUserId;
    if (!isPassenger && !isDriver) {
        throw new ApiError_1.ApiError('You are not part of this booking', shared_constants_1.HTTP_STATUS.FORBIDDEN, shared_constants_1.ERROR_CODES.FORBIDDEN);
    }
    const ratingType = isPassenger ? 'PASSENGER_RATES_DRIVER' : 'DRIVER_RATES_PASSENGER';
    const ratedUserId = isPassenger ? (booking.driver?.userId ?? '') : booking.passenger.userId;
    // Check if already rated
    const existing = await database_1.prisma.rating.findUnique({ where: { bookingId_ratingType: { bookingId, ratingType } } });
    if (existing)
        throw new ApiError_1.ApiError('You have already rated this booking', shared_constants_1.HTTP_STATUS.CONFLICT, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    const rating = await database_1.prisma.rating.create({
        data: {
            id: (0, uuid_1.v4)(),
            tenantId,
            bookingId,
            ratedByUserId,
            ratedUserId,
            ratingType,
            score,
            comment: comment ?? null,
        },
    });
    // Update average rating
    if (isPassenger && booking.driver?.id) {
        const { _avg } = await database_1.prisma.rating.aggregate({
            where: { ratedUserId: booking.driver.userId, ratingType: 'PASSENGER_RATES_DRIVER' },
            _avg: { score: true },
        });
        await database_1.prisma.driver.update({
            where: { id: booking.driver.id },
            data: { rating: _avg.score ?? 5 },
        });
    }
    else {
        const { _avg } = await database_1.prisma.rating.aggregate({
            where: { ratedUserId: booking.passenger.userId, ratingType: 'DRIVER_RATES_PASSENGER' },
            _avg: { score: true },
        });
        await database_1.prisma.passenger.update({
            where: { userId: booking.passenger.userId },
            data: { rating: _avg.score ?? 5 },
        });
    }
    logger.info('Rating submitted', { bookingId, ratingType, score });
    return rating;
}
async function getDriverRatings(driverId, tenantId, page = 1, limit = 20) {
    const driver = await database_1.prisma.driver.findFirst({ where: { id: driverId, tenantId }, select: { userId: true, rating: true } });
    if (!driver)
        throw new ApiError_1.ApiError('Driver not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.DRIVER_NOT_FOUND);
    const ratings = await database_1.prisma.rating.findMany({
        where: { ratedUserId: driver.userId, ratingType: 'PASSENGER_RATES_DRIVER', tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { ratedByUser: { select: { firstName: true, lastName: true, avatarUrl: true } } },
    });
    return { averageRating: driver.rating, ratings };
}
//# sourceMappingURL=ratings.service.js.map