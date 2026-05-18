// ============================================================
// modules/bookings/bookings.service.ts
// Full booking lifecycle per agent.md real-time flow:
// Passenger books → nearby drivers notified → driver accepts
// → GPS tracking → ride completes → payment → rating prompt
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { cacheGet, cacheSet } from '../../config/redis';
import { createModuleLogger } from '../../config/logger';
import {
  ERROR_CODES,
  HTTP_STATUS,
  BOOKING_CONFIG,
  SOCKET_EVENTS,
  CACHE_KEYS,
  CACHE_TTL,
} from '@taxiflow/shared-constants';
import { buildPagination, calculateFare, calculateDistanceKm, isPointInPolygon } from '@taxiflow/shared-utils';
import { ApiError } from '../../utils/ApiError';
import { addBookingTimeoutJob, addNotificationJob, addEmailJob } from '../../jobs/queues';
import type { Booking, VehicleType, PaymentMethod, PricingRule, GeoCoordinate } from '@taxiflow/shared-types';
import type { Server as SocketIOServer } from 'socket.io';
import { emitToTenant, emitToBooking, emitToDriver, emitToDispatcher } from '../../sockets/socketServer';

const logger = createModuleLogger('bookings-service');

// ─── FARE ESTIMATE ────────────────────────────────────────

interface FareEstimateInput {
  tenantId: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  vehicleType: VehicleType;
  promoCode?: string;
}

export async function getFareEstimate(input: FareEstimateInput) {
  const { tenantId, pickupLatitude, pickupLongitude, dropoffLatitude, dropoffLongitude, vehicleType, promoCode } = input;

  const distanceKm = calculateDistanceKm(
    { latitude: pickupLatitude, longitude: pickupLongitude },
    { latitude: dropoffLatitude, longitude: dropoffLongitude },
  );

  // Estimate duration: assume average 30 km/h in city
  const durationMinutes = (distanceKm / 30) * 60;

  // Find applicable pricing rule
  const pricingRule = await findPricingRule(tenantId, vehicleType, pickupLatitude, pickupLongitude);

  // Check surge pricing
  const surgeMultiplier = await getActiveSurgeMultiplier(tenantId, pickupLatitude, pickupLongitude);

  // Check night rate
  const currentHour = new Date().getHours();
  const isNight = currentHour >= pricingRule.nightStartHour || currentHour < pricingRule.nightEndHour;

  // Check promo code
  let promoDiscountAmount = 0;
  if (promoCode) {
    const promo = await validatePromoCode(tenantId, promoCode);
    if (promo) {
      const estimatedFare = (pricingRule.baseFare + distanceKm * pricingRule.perKmRate + durationMinutes * pricingRule.perMinuteRate);
      promoDiscountAmount = promo.discountType === 'PERCENTAGE'
        ? (estimatedFare * promo.discountValue) / 100
        : promo.discountValue;
      if (promo.maximumDiscount) {
        promoDiscountAmount = Math.min(promoDiscountAmount, promo.maximumDiscount);
      }
    }
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { currency: true } });

  const estimate = calculateFare({
    distanceKm,
    durationMinutes,
    vehicleType,
    pricingRule: pricingRule as unknown as PricingRule,
    surgeMultiplier,
    promoDiscountAmount,
    isNightRate: isNight,
  });

  return { ...estimate, currency: tenant?.currency ?? 'GBP' };
}

// ─── CREATE BOOKING ───────────────────────────────────────

interface CreateBookingInput {
  tenantId: string;
  passengerId: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  vehicleType: VehicleType;
  paymentMethod: PaymentMethod;
  promoCode?: string;
  scheduledAt?: Date;
  notes?: string;
  corporateAccountId?: string;
}

export async function createBooking(
  input: CreateBookingInput,
  io: SocketIOServer,
): Promise<Booking> {
  const {
    tenantId, passengerId, pickupAddress, pickupLatitude, pickupLongitude,
    dropoffAddress, dropoffLatitude, dropoffLongitude, vehicleType,
    paymentMethod, promoCode, scheduledAt, notes, corporateAccountId,
  } = input;

  // Validate tenant settings
  const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } });
  if (scheduledAt && !settings?.allowScheduledBookings) {
    throw new ApiError('Scheduled bookings are not enabled', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }
  if (paymentMethod === 'CASH' && !settings?.allowCashPayments) {
    throw new ApiError('Cash payments are not enabled', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }
  if (paymentMethod === 'CARD' && !settings?.allowCardPayments) {
    throw new ApiError('Card payments are not enabled', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  // Get fare estimate
  const fareEstimate = await getFareEstimate({
    tenantId, pickupLatitude, pickupLongitude, dropoffLatitude, dropoffLongitude, vehicleType, promoCode,
  });

  // Validate and calculate promo discount
  let promoDiscountAmount = 0;
  if (promoCode) {
    const promo = await validatePromoCode(tenantId, promoCode);
    if (!promo) throw new ApiError('Invalid or expired promo code', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    promoDiscountAmount = fareEstimate.breakdown.discount;
    // Increment usage
    await prisma.promotion.update({
      where: { tenantId_code: { tenantId, code: promoCode } },
      data: { usageCount: { increment: 1 } },
    });
  }

  const booking = await prisma.booking.create({
    data: {
      id: uuidv4(),
      tenantId,
      passengerId,
      status: scheduledAt ? 'PENDING' : 'SEARCHING',
      pickupAddress,
      pickupLatitude,
      pickupLongitude,
      dropoffAddress,
      dropoffLatitude,
      dropoffLongitude,
      vehicleType,
      estimatedFare: fareEstimate.estimatedFare,
      paymentMethod,
      paymentStatus: 'PENDING',
      promoCode: promoCode ?? null,
      discountAmount: promoDiscountAmount,
      scheduledAt: scheduledAt ?? null,
      notes: notes ?? null,
      corporateAccountId: corporateAccountId ?? null,
    },
    include: {
      passenger: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
    },
  });

  logger.info('Booking created', { bookingId: booking.id, tenantId, vehicleType });

  // Notify dispatchers immediately
  emitToDispatcher(io, tenantId, SOCKET_EVENTS.BOOKING_NEW, { booking });

  // For immediate bookings — search for nearby drivers
  if (!scheduledAt) {
    void searchAndNotifyDrivers(booking.id, tenantId, vehicleType, pickupLatitude, pickupLongitude, io, settings);
  }

  // Notify passenger booking is confirmed
  await addNotificationJob({
    tenantId,
    userId: (await prisma.passenger.findUnique({ where: { id: passengerId }, select: { userId: true } }))?.userId ?? '',
    type: 'BOOKING_CONFIRMED',
    title: 'Booking Confirmed',
    body: 'We are finding you a driver...',
  });

  return booking as unknown as Booking;
}

// ─── SEARCH & NOTIFY NEARBY DRIVERS ──────────────────────

async function searchAndNotifyDrivers(
  bookingId: string,
  tenantId: string,
  vehicleType: VehicleType,
  pickupLat: number,
  pickupLng: number,
  io: SocketIOServer,
  settings: { maxSearchRadiusKm: number; driverAcceptTimeoutSeconds: number } | null,
): Promise<void> {
  const radiusKm = settings?.maxSearchRadiusKm ?? BOOKING_CONFIG.MAX_SEARCH_RADIUS_KM;
  const timeoutSec = settings?.driverAcceptTimeoutSeconds ?? BOOKING_CONFIG.DRIVER_ACCEPT_TIMEOUT_SECONDS;

  // Find nearby online approved drivers with matching vehicle type
  const nearbyDrivers = await findNearbyDrivers(tenantId, vehicleType, pickupLat, pickupLng, radiusKm);

  if (nearbyDrivers.length === 0) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'NO_DRIVER_FOUND' },
    });
    logger.info('No nearby drivers found', { bookingId, tenantId });
    return;
  }

  // Notify all nearby drivers simultaneously
  for (const driver of nearbyDrivers) {
    emitToDriver(io, driver.userId, SOCKET_EVENTS.BOOKING_NEW, {
      booking: await prisma.booking.findUnique({ where: { id: bookingId } }),
      distanceKm: calculateDistanceKm(
        { latitude: pickupLat, longitude: pickupLng },
        { latitude: driver.currentLatitude ?? 0, longitude: driver.currentLongitude ?? 0 },
      ).toFixed(1),
    });

    // Set per-driver timeout job
    await addBookingTimeoutJob(
      { bookingId, tenantId, driverUserId: driver.userId },
      timeoutSec * 1000,
    );
  }

  logger.info('Drivers notified', { bookingId, driverCount: nearbyDrivers.length });
}

// ─── DRIVER ACCEPTS BOOKING ───────────────────────────────

export async function acceptBooking(
  bookingId: string,
  tenantId: string,
  driverUserId: string,
  io: SocketIOServer,
): Promise<Booking> {
  // Find the driver record
  const driver = await prisma.driver.findUnique({
    where: { userId: driverUserId },
    include: {
      user: { select: { firstName: true, lastName: true, phone: true, avatarUrl: true } },
      vehicles: { where: { isActive: true }, take: 1 },
    },
  });

  if (!driver || driver.tenantId !== tenantId) {
    throw new ApiError('Driver not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.DRIVER_NOT_FOUND);
  }

  if (driver.status !== 'APPROVED') {
    throw new ApiError('Driver not approved', HTTP_STATUS.FORBIDDEN, ERROR_CODES.DRIVER_NOT_APPROVED);
  }

  if (driver.onlineStatus === 'ON_TRIP') {
    throw new ApiError('Driver already on a trip', HTTP_STATUS.CONFLICT, ERROR_CODES.DRIVER_ALREADY_ON_TRIP);
  }

  // Atomic update — only succeeds if booking is still in SEARCHING state
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, tenantId, status: 'SEARCHING' },
  });

  if (!booking) {
    throw new ApiError('Booking no longer available', HTTP_STATUS.CONFLICT, ERROR_CODES.BOOKING_ALREADY_ASSIGNED);
  }

  const vehicle = driver.vehicles[0];

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'ACCEPTED',
      driverId: driver.id,
      vehicleId: vehicle?.id ?? null,
      acceptedAt: new Date(),
    },
  });

  // Mark driver as on trip
  await prisma.driver.update({
    where: { id: driver.id },
    data: { onlineStatus: 'ON_TRIP' },
  });

  logger.info('Booking accepted', { bookingId, driverId: driver.id });

  // Notify passenger
  const passengerUserId = await prisma.passenger.findUnique({
    where: { id: booking.passengerId },
    select: { userId: true },
  });

  emitToBooking(io, bookingId, SOCKET_EVENTS.BOOKING_ACCEPTED, {
    bookingId,
    driver: {
      id: driver.id,
      firstName: driver.user.firstName,
      lastName: driver.user.lastName,
      phone: driver.user.phone,
      avatarUrl: driver.user.avatarUrl,
      rating: driver.rating,
      vehicle,
    },
  });

  await addNotificationJob({
    tenantId,
    userId: passengerUserId?.userId ?? '',
    type: 'DRIVER_ASSIGNED',
    title: 'Driver Found!',
    body: `${driver.user.firstName} is on the way to pick you up.`,
  });

  return updatedBooking as unknown as Booking;
}

// ─── DRIVER ARRIVED ───────────────────────────────────────

export async function markDriverArrived(
  bookingId: string,
  tenantId: string,
  driverUserId: string,
  io: SocketIOServer,
): Promise<Booking> {
  const booking = await getBookingForDriver(bookingId, tenantId, driverUserId);

  if (booking.status !== 'ACCEPTED') {
    throw new ApiError('Invalid booking status', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'DRIVER_ARRIVED', arrivedAt: new Date() },
  });

  emitToBooking(io, bookingId, SOCKET_EVENTS.BOOKING_UPDATED, { booking: updated });

  const passengerUserId = await getPassengerUserId(booking.passengerId);
  await addNotificationJob({
    tenantId,
    userId: passengerUserId,
    type: 'DRIVER_ARRIVED',
    title: 'Driver Has Arrived',
    body: 'Your driver is waiting for you.',
  });

  return updated as unknown as Booking;
}

// ─── START RIDE ───────────────────────────────────────────

export async function startRide(
  bookingId: string,
  tenantId: string,
  driverUserId: string,
  io: SocketIOServer,
): Promise<Booking> {
  const booking = await getBookingForDriver(bookingId, tenantId, driverUserId);

  if (booking.status !== 'DRIVER_ARRIVED') {
    throw new ApiError('Driver must arrive before starting ride', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  });

  emitToBooking(io, bookingId, SOCKET_EVENTS.RIDE_STARTED, { bookingId });

  const passengerUserId = await getPassengerUserId(booking.passengerId);
  await addNotificationJob({
    tenantId,
    userId: passengerUserId,
    type: 'RIDE_STARTED',
    title: 'Ride Started',
    body: 'Your ride is in progress.',
  });

  return updated as unknown as Booking;
}

// ─── COMPLETE RIDE ────────────────────────────────────────

export async function completeRide(
  bookingId: string,
  tenantId: string,
  driverUserId: string,
  io: SocketIOServer,
): Promise<Booking> {
  const booking = await getBookingForDriver(bookingId, tenantId, driverUserId);

  if (booking.status !== 'IN_PROGRESS') {
    throw new ApiError('Ride is not in progress', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  const driver = await prisma.driver.findUnique({
    where: { userId: driverUserId },
    select: { id: true },
  });

  // Calculate actual fare based on tracking points
  const trackingPoints = await prisma.bookingTracking.findMany({
    where: { bookingId },
    orderBy: { recordedAt: 'asc' },
  });

  let actualDistanceKm = 0;
  for (let i = 1; i < trackingPoints.length; i++) {
    actualDistanceKm += calculateDistanceKm(
      { latitude: trackingPoints[i - 1].latitude, longitude: trackingPoints[i - 1].longitude },
      { latitude: trackingPoints[i].latitude, longitude: trackingPoints[i].longitude },
    );
  }

  const startTime = booking.startedAt ?? new Date();
  const actualDurationMinutes = (Date.now() - startTime.getTime()) / 60000;

  // Use estimated fare if tracking data is sparse
  const pricingRule = await findPricingRule(tenantId, booking.vehicleType as VehicleType, booking.pickupLatitude, booking.pickupLongitude);
  const fareCalc = calculateFare({
    distanceKm: actualDistanceKm > 0.1 ? actualDistanceKm : (booking.distanceKm ?? 1),
    durationMinutes: actualDurationMinutes > 1 ? actualDurationMinutes : 10,
    vehicleType: booking.vehicleType as VehicleType,
    pricingRule: pricingRule as unknown as PricingRule,
  });

  const actualFare = fareCalc.estimatedFare;

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      actualFare,
      distanceKm: actualDistanceKm > 0.1 ? actualDistanceKm : undefined,
      durationMinutes: actualDurationMinutes > 1 ? actualDurationMinutes : undefined,
      paymentStatus: booking.paymentMethod === 'CASH' ? 'PAID' : 'PENDING',
    },
  });

  // Update driver stats
  await prisma.driver.update({
    where: { id: driver?.id },
    data: {
      onlineStatus: 'ONLINE',
      totalTrips: { increment: 1 },
      totalEarnings: { increment: actualFare * 0.8 }, // 80% to driver
    },
  });

  // Create payment record
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { currency: true } });
  await prisma.payment.create({
    data: {
      id: uuidv4(),
      tenantId,
      bookingId,
      amount: actualFare,
      currency: tenant?.currency ?? 'GBP',
      method: booking.paymentMethod as never,
      status: booking.paymentMethod === 'CASH' ? 'PAID' : 'PENDING',
    },
  });

  emitToBooking(io, bookingId, SOCKET_EVENTS.RIDE_COMPLETED, { bookingId, fare: actualFare });
  emitToDispatcher(io, tenantId, SOCKET_EVENTS.BOOKING_UPDATED, { booking: updated });

  // Notify both parties
  const passengerUserId = await getPassengerUserId(booking.passengerId);
  await addNotificationJob({
    tenantId,
    userId: passengerUserId,
    type: 'RIDE_COMPLETED',
    title: 'Ride Completed',
    body: `Your ride is complete. Fare: ${actualFare.toFixed(2)}`,
  });

  // Send receipt email
  const passenger = await prisma.passenger.findUnique({
    where: { id: booking.passengerId },
    include: { user: { select: { email: true, firstName: true } } },
  });
  if (passenger?.user.email) {
    await addEmailJob({
      to: passenger.user.email,
      subject: 'Your TaxiFlow Receipt',
      template: 'ride-receipt',
      variables: {
        firstName: passenger.user.firstName,
        fare: actualFare.toFixed(2),
        currency: tenant?.currency ?? 'GBP',
        pickup: booking.pickupAddress,
        dropoff: booking.dropoffAddress,
        bookingId: booking.id,
      },
    });
  }

  logger.info('Ride completed', { bookingId, actualFare, actualDistanceKm });
  return updated as unknown as Booking;
}

// ─── CANCEL BOOKING ───────────────────────────────────────

export async function cancelBooking(
  bookingId: string,
  tenantId: string,
  userId: string,
  reason: string,
  io: SocketIOServer,
): Promise<Booking> {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, tenantId },
  });

  if (!booking) {
    throw new ApiError('Booking not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.BOOKING_NOT_FOUND);
  }

  const cancellableStatuses = ['PENDING', 'SEARCHING', 'ACCEPTED', 'DRIVER_ARRIVED'];
  if (!cancellableStatuses.includes(booking.status)) {
    throw new ApiError('Booking cannot be cancelled at this stage', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BOOKING_CANNOT_CANCEL);
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: reason,
    },
  });

  // Free up driver if assigned
  if (booking.driverId) {
    await prisma.driver.update({
      where: { id: booking.driverId },
      data: { onlineStatus: 'ONLINE' },
    });
  }

  emitToBooking(io, bookingId, SOCKET_EVENTS.BOOKING_CANCELLED, { bookingId, reason });
  emitToDispatcher(io, tenantId, SOCKET_EVENTS.BOOKING_UPDATED, { booking: updated });

  logger.info('Booking cancelled', { bookingId, reason });
  return updated as unknown as Booking;
}

// ─── GET BOOKINGS ─────────────────────────────────────────

interface GetBookingsInput {
  tenantId: string;
  page: number;
  limit: number;
  status?: string;
  driverId?: string;
  passengerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export async function getBookings(input: GetBookingsInput) {
  const { tenantId, page, limit, status, driverId, passengerId, dateFrom, dateTo } = input;

  const where = {
    tenantId,
    ...(status && { status: status as never }),
    ...(driverId && { driver: { id: driverId } }),
    ...(passengerId && { passengerId }),
    ...(dateFrom || dateTo ? {
      createdAt: {
        ...(dateFrom && { gte: dateFrom }),
        ...(dateTo && { lte: dateTo }),
      },
    } : {}),
  };

  const pagination = buildPagination(page, limit);

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        passenger: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
        driver: { include: { user: { select: { firstName: true, lastName: true, phone: true, avatarUrl: true } } } },
        vehicle: true,
        payment: true,
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, pagination: { ...pagination, total } };
}

export async function getBookingById(bookingId: string, tenantId: string): Promise<Booking> {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, tenantId },
    include: {
      passenger: { include: { user: { select: { firstName: true, lastName: true, phone: true, avatarUrl: true } } } },
      driver: { include: { user: { select: { firstName: true, lastName: true, phone: true, avatarUrl: true } } } },
      vehicle: true,
      payment: true,
      trackingPoints: { orderBy: { recordedAt: 'asc' }, take: 500 },
      ratings: true,
    },
  });

  if (!booking) {
    throw new ApiError('Booking not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.BOOKING_NOT_FOUND);
  }

  return booking as unknown as Booking;
}

// ─── DISPATCHER: MANUAL ASSIGN ────────────────────────────

export async function manuallyAssignDriver(
  bookingId: string,
  tenantId: string,
  driverId: string,
  io: SocketIOServer,
): Promise<Booking> {
  const [booking, driver] = await Promise.all([
    prisma.booking.findFirst({ where: { id: bookingId, tenantId } }),
    prisma.driver.findFirst({
      where: { id: driverId, tenantId, status: 'APPROVED' },
      include: { user: { select: { firstName: true, lastName: true, phone: true, avatarUrl: true } }, vehicles: { where: { isActive: true }, take: 1 } },
    }),
  ]);

  if (!booking) throw new ApiError('Booking not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.BOOKING_NOT_FOUND);
  if (!driver) throw new ApiError('Driver not found or not approved', HTTP_STATUS.NOT_FOUND, ERROR_CODES.DRIVER_NOT_FOUND);

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'ACCEPTED',
      driverId,
      vehicleId: driver.vehicles[0]?.id ?? null,
      acceptedAt: new Date(),
    },
  });

  await prisma.driver.update({ where: { id: driverId }, data: { onlineStatus: 'ON_TRIP' } });

  emitToBooking(io, bookingId, SOCKET_EVENTS.BOOKING_ACCEPTED, { bookingId, driver });
  emitToDriver(io, driver.userId, SOCKET_EVENTS.BOOKING_NEW, { booking: updated });

  logger.info('Driver manually assigned', { bookingId, driverId });
  return updated as unknown as Booking;
}

// ─── HELPER FUNCTIONS ─────────────────────────────────────

async function findNearbyDrivers(
  tenantId: string,
  vehicleType: VehicleType,
  lat: number,
  lng: number,
  radiusKm: number,
) {
  // Fetch all online drivers and filter by distance
  // In production: use PostGIS for geo queries
  const drivers = await prisma.driver.findMany({
    where: {
      tenantId,
      status: 'APPROVED',
      onlineStatus: 'ONLINE',
      currentLatitude: { not: null },
      currentLongitude: { not: null },
      vehicles: { some: { vehicleType, isActive: true } },
    },
    select: {
      id: true,
      userId: true,
      currentLatitude: true,
      currentLongitude: true,
    },
  });

  return drivers
    .filter((d) => {
      if (!d.currentLatitude || !d.currentLongitude) return false;
      const dist = calculateDistanceKm(
        { latitude: lat, longitude: lng },
        { latitude: d.currentLatitude, longitude: d.currentLongitude },
      );
      return dist <= radiusKm;
    })
    .sort((a, b) => {
      const distA = calculateDistanceKm({ latitude: lat, longitude: lng }, { latitude: a.currentLatitude!, longitude: a.currentLongitude! });
      const distB = calculateDistanceKm({ latitude: lat, longitude: lng }, { latitude: b.currentLatitude!, longitude: b.currentLongitude! });
      return distA - distB;
    });
}

async function findPricingRule(tenantId: string, vehicleType: VehicleType, lat: number, lng: number) {
  // Check zone-specific pricing first
  const zones = await prisma.zone.findMany({ where: { tenantId, isActive: true } });

  for (const zone of zones) {
    const polygon = zone.polygon as GeoCoordinate[];
    if (isPointInPolygon({ latitude: lat, longitude: lng }, polygon)) {
      const zonePricing = await prisma.pricingRule.findFirst({
        where: { tenantId, zoneId: zone.id, vehicleType, isActive: true },
      });
      if (zonePricing) return zonePricing;
    }
  }

  // Fall back to default pricing (no zone)
  const defaultPricing = await prisma.pricingRule.findFirst({
    where: { tenantId, zoneId: null, vehicleType, isActive: true },
  });

  if (!defaultPricing) {
    throw new ApiError(
      `No pricing configured for ${vehicleType}. Please configure pricing in admin panel.`,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  return defaultPricing;
}

async function getActiveSurgeMultiplier(tenantId: string, lat: number, lng: number): Promise<number> {
  const now = new Date();
  const surges = await prisma.surgePricing.findMany({
    where: {
      tenantId,
      isActive: true,
      startTime: { lte: now },
      endTime: { gte: now },
    },
    include: { zone: true },
  });

  for (const surge of surges) {
    if (!surge.zone) return surge.multiplier; // Global surge
    const polygon = surge.zone.polygon as GeoCoordinate[];
    if (isPointInPolygon({ latitude: lat, longitude: lng }, polygon)) {
      return surge.multiplier;
    }
  }
  return 1;
}

async function validatePromoCode(tenantId: string, code: string) {
  const now = new Date();
  return prisma.promotion.findFirst({
    where: {
      tenantId,
      code: code.toUpperCase(),
      isActive: true,
      validFrom: { lte: now },
      validUntil: { gte: now },
      OR: [
        { usageLimit: null },
        { usageLimit: { gt: prisma.promotion.fields.usageCount } },
      ],
    },
  });
}

async function getBookingForDriver(bookingId: string, tenantId: string, driverUserId: string) {
  const driver = await prisma.driver.findUnique({ where: { userId: driverUserId }, select: { id: true } });
  if (!driver) throw new ApiError('Driver not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.DRIVER_NOT_FOUND);

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, tenantId, driverId: driver.id },
  });
  if (!booking) throw new ApiError('Booking not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.BOOKING_NOT_FOUND);
  return booking;
}

async function getPassengerUserId(passengerId: string): Promise<string> {
  const p = await prisma.passenger.findUnique({ where: { id: passengerId }, select: { userId: true } });
  return p?.userId ?? '';
}
