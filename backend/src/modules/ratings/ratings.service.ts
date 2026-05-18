// modules/ratings/ratings.service.ts
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { createModuleLogger } from '../../config/logger';
import { ERROR_CODES, HTTP_STATUS } from '@taxiflow/shared-constants';
import { ApiError } from '../../utils/ApiError';

const logger = createModuleLogger('ratings-service');

export async function submitRating(
  bookingId: string,
  tenantId: string,
  ratedByUserId: string,
  score: number,
  comment?: string,
) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, tenantId, status: 'COMPLETED' },
    include: {
      passenger: { select: { userId: true, id: true } },
      driver: { select: { userId: true, id: true } },
    },
  });

  if (!booking) throw new ApiError('Completed booking not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.BOOKING_NOT_FOUND);

  const isPassenger = booking.passenger.userId === ratedByUserId;
  const isDriver = booking.driver?.userId === ratedByUserId;

  if (!isPassenger && !isDriver) {
    throw new ApiError('You are not part of this booking', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
  }

  const ratingType = isPassenger ? 'PASSENGER_RATES_DRIVER' : 'DRIVER_RATES_PASSENGER';
  const ratedUserId = isPassenger ? (booking.driver?.userId ?? '') : booking.passenger.userId;

  // Check if already rated
  const existing = await prisma.rating.findUnique({ where: { bookingId_ratingType: { bookingId, ratingType } } });
  if (existing) throw new ApiError('You have already rated this booking', HTTP_STATUS.CONFLICT, ERROR_CODES.VALIDATION_ERROR);

  const rating = await prisma.rating.create({
    data: {
      id: uuidv4(),
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
    const { _avg } = await prisma.rating.aggregate({
      where: { ratedUserId: booking.driver.userId, ratingType: 'PASSENGER_RATES_DRIVER' },
      _avg: { score: true },
    });
    await prisma.driver.update({
      where: { id: booking.driver.id },
      data: { rating: _avg.score ?? 5 },
    });
  } else {
    const { _avg } = await prisma.rating.aggregate({
      where: { ratedUserId: booking.passenger.userId, ratingType: 'DRIVER_RATES_PASSENGER' },
      _avg: { score: true },
    });
    await prisma.passenger.update({
      where: { userId: booking.passenger.userId },
      data: { rating: _avg.score ?? 5 },
    });
  }

  logger.info('Rating submitted', { bookingId, ratingType, score });
  return rating;
}

export async function getDriverRatings(driverId: string, tenantId: string, page = 1, limit = 20) {
  const driver = await prisma.driver.findFirst({ where: { id: driverId, tenantId }, select: { userId: true, rating: true } });
  if (!driver) throw new ApiError('Driver not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.DRIVER_NOT_FOUND);

  const ratings = await prisma.rating.findMany({
    where: { ratedUserId: driver.userId, ratingType: 'PASSENGER_RATES_DRIVER', tenantId },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: { ratedByUser: { select: { firstName: true, lastName: true, avatarUrl: true } } },
  });

  return { averageRating: driver.rating, ratings };
}
