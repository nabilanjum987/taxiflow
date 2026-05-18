"use strict";
// ============================================================
// modules/bookings/bookings.service.ts
// Full booking lifecycle per agent.md real-time flow:
// Passenger books → nearby drivers notified → driver accepts
// → GPS tracking → ride completes → payment → rating prompt
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFareEstimate = getFareEstimate;
exports.createBooking = createBooking;
exports.acceptBooking = acceptBooking;
exports.markDriverArrived = markDriverArrived;
exports.startRide = startRide;
exports.completeRide = completeRide;
exports.cancelBooking = cancelBooking;
exports.getBookings = getBookings;
exports.getBookingById = getBookingById;
exports.manuallyAssignDriver = manuallyAssignDriver;
const uuid_1 = require("uuid");
const database_1 = require("../../config/database");
const logger_1 = require("../../config/logger");
const shared_constants_1 = require("@taxiflow/shared-constants");
const shared_utils_1 = require("@taxiflow/shared-utils");
const ApiError_1 = require("../../utils/ApiError");
const queues_1 = require("../../jobs/queues");
const socketServer_1 = require("../../sockets/socketServer");
const logger = (0, logger_1.createModuleLogger)('bookings-service');
async function getFareEstimate(input) {
    const { tenantId, pickupLatitude, pickupLongitude, dropoffLatitude, dropoffLongitude, vehicleType, promoCode } = input;
    const distanceKm = (0, shared_utils_1.calculateDistanceKm)({ latitude: pickupLatitude, longitude: pickupLongitude }, { latitude: dropoffLatitude, longitude: dropoffLongitude });
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
    const tenant = await database_1.prisma.tenant.findUnique({ where: { id: tenantId }, select: { currency: true } });
    const estimate = (0, shared_utils_1.calculateFare)({
        distanceKm,
        durationMinutes,
        vehicleType,
        pricingRule: pricingRule,
        surgeMultiplier,
        promoDiscountAmount,
        isNightRate: isNight,
    });
    return { ...estimate, currency: tenant?.currency ?? 'GBP' };
}
async function createBooking(input, io) {
    const { tenantId, passengerId, pickupAddress, pickupLatitude, pickupLongitude, dropoffAddress, dropoffLatitude, dropoffLongitude, vehicleType, paymentMethod, promoCode, scheduledAt, notes, corporateAccountId, } = input;
    // Validate tenant settings
    const settings = await database_1.prisma.tenantSettings.findUnique({ where: { tenantId } });
    if (scheduledAt && !settings?.allowScheduledBookings) {
        throw new ApiError_1.ApiError('Scheduled bookings are not enabled', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    if (paymentMethod === 'CASH' && !settings?.allowCashPayments) {
        throw new ApiError_1.ApiError('Cash payments are not enabled', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    if (paymentMethod === 'CARD' && !settings?.allowCardPayments) {
        throw new ApiError_1.ApiError('Card payments are not enabled', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    // Get fare estimate
    const fareEstimate = await getFareEstimate({
        tenantId, pickupLatitude, pickupLongitude, dropoffLatitude, dropoffLongitude, vehicleType, promoCode,
    });
    // Validate and calculate promo discount
    let promoDiscountAmount = 0;
    if (promoCode) {
        const promo = await validatePromoCode(tenantId, promoCode);
        if (!promo)
            throw new ApiError_1.ApiError('Invalid or expired promo code', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
        promoDiscountAmount = fareEstimate.breakdown.discount;
        // Increment usage
        await database_1.prisma.promotion.update({
            where: { tenantId_code: { tenantId, code: promoCode } },
            data: { usageCount: { increment: 1 } },
        });
    }
    const booking = await database_1.prisma.booking.create({
        data: {
            id: (0, uuid_1.v4)(),
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
    (0, socketServer_1.emitToDispatcher)(io, tenantId, shared_constants_1.SOCKET_EVENTS.BOOKING_NEW, { booking });
    // For immediate bookings — search for nearby drivers
    if (!scheduledAt) {
        void searchAndNotifyDrivers(booking.id, tenantId, vehicleType, pickupLatitude, pickupLongitude, io, settings);
    }
    // Notify passenger booking is confirmed
    await (0, queues_1.addNotificationJob)({
        tenantId,
        userId: (await database_1.prisma.passenger.findUnique({ where: { id: passengerId }, select: { userId: true } }))?.userId ?? '',
        type: 'BOOKING_CONFIRMED',
        title: 'Booking Confirmed',
        body: 'We are finding you a driver...',
    });
    return booking;
}
// ─── SEARCH & NOTIFY NEARBY DRIVERS ──────────────────────
async function searchAndNotifyDrivers(bookingId, tenantId, vehicleType, pickupLat, pickupLng, io, settings) {
    const radiusKm = settings?.maxSearchRadiusKm ?? shared_constants_1.BOOKING_CONFIG.MAX_SEARCH_RADIUS_KM;
    const timeoutSec = settings?.driverAcceptTimeoutSeconds ?? shared_constants_1.BOOKING_CONFIG.DRIVER_ACCEPT_TIMEOUT_SECONDS;
    // Find nearby online approved drivers with matching vehicle type
    const nearbyDrivers = await findNearbyDrivers(tenantId, vehicleType, pickupLat, pickupLng, radiusKm);
    if (nearbyDrivers.length === 0) {
        await database_1.prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'NO_DRIVER_FOUND' },
        });
        logger.info('No nearby drivers found', { bookingId, tenantId });
        return;
    }
    // Notify all nearby drivers simultaneously
    for (const driver of nearbyDrivers) {
        (0, socketServer_1.emitToDriver)(io, driver.userId, shared_constants_1.SOCKET_EVENTS.BOOKING_NEW, {
            booking: await database_1.prisma.booking.findUnique({ where: { id: bookingId } }),
            distanceKm: (0, shared_utils_1.calculateDistanceKm)({ latitude: pickupLat, longitude: pickupLng }, { latitude: driver.currentLatitude ?? 0, longitude: driver.currentLongitude ?? 0 }).toFixed(1),
        });
        // Set per-driver timeout job
        await (0, queues_1.addBookingTimeoutJob)({ bookingId, tenantId, driverUserId: driver.userId }, timeoutSec * 1000);
    }
    logger.info('Drivers notified', { bookingId, driverCount: nearbyDrivers.length });
}
// ─── DRIVER ACCEPTS BOOKING ───────────────────────────────
async function acceptBooking(bookingId, tenantId, driverUserId, io) {
    // Find the driver record
    const driver = await database_1.prisma.driver.findUnique({
        where: { userId: driverUserId },
        include: {
            user: { select: { firstName: true, lastName: true, phone: true, avatarUrl: true } },
            vehicles: { where: { isActive: true }, take: 1 },
        },
    });
    if (!driver || driver.tenantId !== tenantId) {
        throw new ApiError_1.ApiError('Driver not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.DRIVER_NOT_FOUND);
    }
    if (driver.status !== 'APPROVED') {
        throw new ApiError_1.ApiError('Driver not approved', shared_constants_1.HTTP_STATUS.FORBIDDEN, shared_constants_1.ERROR_CODES.DRIVER_NOT_APPROVED);
    }
    if (driver.onlineStatus === 'ON_TRIP') {
        throw new ApiError_1.ApiError('Driver already on a trip', shared_constants_1.HTTP_STATUS.CONFLICT, shared_constants_1.ERROR_CODES.DRIVER_ALREADY_ON_TRIP);
    }
    // Atomic update — only succeeds if booking is still in SEARCHING state
    const booking = await database_1.prisma.booking.findFirst({
        where: { id: bookingId, tenantId, status: 'SEARCHING' },
    });
    if (!booking) {
        throw new ApiError_1.ApiError('Booking no longer available', shared_constants_1.HTTP_STATUS.CONFLICT, shared_constants_1.ERROR_CODES.BOOKING_ALREADY_ASSIGNED);
    }
    const vehicle = driver.vehicles[0];
    const updatedBooking = await database_1.prisma.booking.update({
        where: { id: bookingId },
        data: {
            status: 'ACCEPTED',
            driverId: driver.id,
            vehicleId: vehicle?.id ?? null,
            acceptedAt: new Date(),
        },
    });
    // Mark driver as on trip
    await database_1.prisma.driver.update({
        where: { id: driver.id },
        data: { onlineStatus: 'ON_TRIP' },
    });
    logger.info('Booking accepted', { bookingId, driverId: driver.id });
    // Notify passenger
    const passengerUserId = await database_1.prisma.passenger.findUnique({
        where: { id: booking.passengerId },
        select: { userId: true },
    });
    (0, socketServer_1.emitToBooking)(io, bookingId, shared_constants_1.SOCKET_EVENTS.BOOKING_ACCEPTED, {
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
    await (0, queues_1.addNotificationJob)({
        tenantId,
        userId: passengerUserId?.userId ?? '',
        type: 'DRIVER_ASSIGNED',
        title: 'Driver Found!',
        body: `${driver.user.firstName} is on the way to pick you up.`,
    });
    return updatedBooking;
}
// ─── DRIVER ARRIVED ───────────────────────────────────────
async function markDriverArrived(bookingId, tenantId, driverUserId, io) {
    const booking = await getBookingForDriver(bookingId, tenantId, driverUserId);
    if (booking.status !== 'ACCEPTED') {
        throw new ApiError_1.ApiError('Invalid booking status', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    const updated = await database_1.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'DRIVER_ARRIVED', arrivedAt: new Date() },
    });
    (0, socketServer_1.emitToBooking)(io, bookingId, shared_constants_1.SOCKET_EVENTS.BOOKING_UPDATED, { booking: updated });
    const passengerUserId = await getPassengerUserId(booking.passengerId);
    await (0, queues_1.addNotificationJob)({
        tenantId,
        userId: passengerUserId,
        type: 'DRIVER_ARRIVED',
        title: 'Driver Has Arrived',
        body: 'Your driver is waiting for you.',
    });
    return updated;
}
// ─── START RIDE ───────────────────────────────────────────
async function startRide(bookingId, tenantId, driverUserId, io) {
    const booking = await getBookingForDriver(bookingId, tenantId, driverUserId);
    if (booking.status !== 'DRIVER_ARRIVED') {
        throw new ApiError_1.ApiError('Driver must arrive before starting ride', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    const updated = await database_1.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });
    (0, socketServer_1.emitToBooking)(io, bookingId, shared_constants_1.SOCKET_EVENTS.RIDE_STARTED, { bookingId });
    const passengerUserId = await getPassengerUserId(booking.passengerId);
    await (0, queues_1.addNotificationJob)({
        tenantId,
        userId: passengerUserId,
        type: 'RIDE_STARTED',
        title: 'Ride Started',
        body: 'Your ride is in progress.',
    });
    return updated;
}
// ─── COMPLETE RIDE ────────────────────────────────────────
async function completeRide(bookingId, tenantId, driverUserId, io) {
    const booking = await getBookingForDriver(bookingId, tenantId, driverUserId);
    if (booking.status !== 'IN_PROGRESS') {
        throw new ApiError_1.ApiError('Ride is not in progress', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    const driver = await database_1.prisma.driver.findUnique({
        where: { userId: driverUserId },
        select: { id: true },
    });
    // Calculate actual fare based on tracking points
    const trackingPoints = await database_1.prisma.bookingTracking.findMany({
        where: { bookingId },
        orderBy: { recordedAt: 'asc' },
    });
    let actualDistanceKm = 0;
    for (let i = 1; i < trackingPoints.length; i++) {
        actualDistanceKm += (0, shared_utils_1.calculateDistanceKm)({ latitude: trackingPoints[i - 1].latitude, longitude: trackingPoints[i - 1].longitude }, { latitude: trackingPoints[i].latitude, longitude: trackingPoints[i].longitude });
    }
    const startTime = booking.startedAt ?? new Date();
    const actualDurationMinutes = (Date.now() - startTime.getTime()) / 60000;
    // Use estimated fare if tracking data is sparse
    const pricingRule = await findPricingRule(tenantId, booking.vehicleType, booking.pickupLatitude, booking.pickupLongitude);
    const fareCalc = (0, shared_utils_1.calculateFare)({
        distanceKm: actualDistanceKm > 0.1 ? actualDistanceKm : (booking.distanceKm ?? 1),
        durationMinutes: actualDurationMinutes > 1 ? actualDurationMinutes : 10,
        vehicleType: booking.vehicleType,
        pricingRule: pricingRule,
    });
    const actualFare = fareCalc.estimatedFare;
    const updated = await database_1.prisma.booking.update({
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
    await database_1.prisma.driver.update({
        where: { id: driver?.id },
        data: {
            onlineStatus: 'ONLINE',
            totalTrips: { increment: 1 },
            totalEarnings: { increment: actualFare * 0.8 }, // 80% to driver
        },
    });
    // Create payment record
    const tenant = await database_1.prisma.tenant.findUnique({ where: { id: tenantId }, select: { currency: true } });
    await database_1.prisma.payment.create({
        data: {
            id: (0, uuid_1.v4)(),
            tenantId,
            bookingId,
            amount: actualFare,
            currency: tenant?.currency ?? 'GBP',
            method: booking.paymentMethod,
            status: booking.paymentMethod === 'CASH' ? 'PAID' : 'PENDING',
        },
    });
    (0, socketServer_1.emitToBooking)(io, bookingId, shared_constants_1.SOCKET_EVENTS.RIDE_COMPLETED, { bookingId, fare: actualFare });
    (0, socketServer_1.emitToDispatcher)(io, tenantId, shared_constants_1.SOCKET_EVENTS.BOOKING_UPDATED, { booking: updated });
    // Notify both parties
    const passengerUserId = await getPassengerUserId(booking.passengerId);
    await (0, queues_1.addNotificationJob)({
        tenantId,
        userId: passengerUserId,
        type: 'RIDE_COMPLETED',
        title: 'Ride Completed',
        body: `Your ride is complete. Fare: ${actualFare.toFixed(2)}`,
    });
    // Send receipt email
    const passenger = await database_1.prisma.passenger.findUnique({
        where: { id: booking.passengerId },
        include: { user: { select: { email: true, firstName: true } } },
    });
    if (passenger?.user.email) {
        await (0, queues_1.addEmailJob)({
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
    return updated;
}
// ─── CANCEL BOOKING ───────────────────────────────────────
async function cancelBooking(bookingId, tenantId, userId, reason, io) {
    const booking = await database_1.prisma.booking.findFirst({
        where: { id: bookingId, tenantId },
    });
    if (!booking) {
        throw new ApiError_1.ApiError('Booking not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.BOOKING_NOT_FOUND);
    }
    const cancellableStatuses = ['PENDING', 'SEARCHING', 'ACCEPTED', 'DRIVER_ARRIVED'];
    if (!cancellableStatuses.includes(booking.status)) {
        throw new ApiError_1.ApiError('Booking cannot be cancelled at this stage', shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.BOOKING_CANNOT_CANCEL);
    }
    const updated = await database_1.prisma.booking.update({
        where: { id: bookingId },
        data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: reason,
        },
    });
    // Free up driver if assigned
    if (booking.driverId) {
        await database_1.prisma.driver.update({
            where: { id: booking.driverId },
            data: { onlineStatus: 'ONLINE' },
        });
    }
    (0, socketServer_1.emitToBooking)(io, bookingId, shared_constants_1.SOCKET_EVENTS.BOOKING_CANCELLED, { bookingId, reason });
    (0, socketServer_1.emitToDispatcher)(io, tenantId, shared_constants_1.SOCKET_EVENTS.BOOKING_UPDATED, { booking: updated });
    logger.info('Booking cancelled', { bookingId, reason });
    return updated;
}
async function getBookings(input) {
    const { tenantId, page, limit, status, driverId, passengerId, dateFrom, dateTo } = input;
    const where = {
        tenantId,
        ...(status && { status: status }),
        ...(driverId && { driver: { id: driverId } }),
        ...(passengerId && { passengerId }),
        ...(dateFrom || dateTo ? {
            createdAt: {
                ...(dateFrom && { gte: dateFrom }),
                ...(dateTo && { lte: dateTo }),
            },
        } : {}),
    };
    const pagination = (0, shared_utils_1.buildPagination)(page, limit);
    const [bookings, total] = await Promise.all([
        database_1.prisma.booking.findMany({
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
        database_1.prisma.booking.count({ where }),
    ]);
    return { bookings, pagination: { ...pagination, total } };
}
async function getBookingById(bookingId, tenantId) {
    const booking = await database_1.prisma.booking.findFirst({
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
        throw new ApiError_1.ApiError('Booking not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.BOOKING_NOT_FOUND);
    }
    return booking;
}
// ─── DISPATCHER: MANUAL ASSIGN ────────────────────────────
async function manuallyAssignDriver(bookingId, tenantId, driverId, io) {
    const [booking, driver] = await Promise.all([
        database_1.prisma.booking.findFirst({ where: { id: bookingId, tenantId } }),
        database_1.prisma.driver.findFirst({
            where: { id: driverId, tenantId, status: 'APPROVED' },
            include: { user: { select: { firstName: true, lastName: true, phone: true, avatarUrl: true } }, vehicles: { where: { isActive: true }, take: 1 } },
        }),
    ]);
    if (!booking)
        throw new ApiError_1.ApiError('Booking not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.BOOKING_NOT_FOUND);
    if (!driver)
        throw new ApiError_1.ApiError('Driver not found or not approved', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.DRIVER_NOT_FOUND);
    const updated = await database_1.prisma.booking.update({
        where: { id: bookingId },
        data: {
            status: 'ACCEPTED',
            driverId,
            vehicleId: driver.vehicles[0]?.id ?? null,
            acceptedAt: new Date(),
        },
    });
    await database_1.prisma.driver.update({ where: { id: driverId }, data: { onlineStatus: 'ON_TRIP' } });
    (0, socketServer_1.emitToBooking)(io, bookingId, shared_constants_1.SOCKET_EVENTS.BOOKING_ACCEPTED, { bookingId, driver });
    (0, socketServer_1.emitToDriver)(io, driver.userId, shared_constants_1.SOCKET_EVENTS.BOOKING_NEW, { booking: updated });
    logger.info('Driver manually assigned', { bookingId, driverId });
    return updated;
}
// ─── HELPER FUNCTIONS ─────────────────────────────────────
async function findNearbyDrivers(tenantId, vehicleType, lat, lng, radiusKm) {
    // Fetch all online drivers and filter by distance
    // In production: use PostGIS for geo queries
    const drivers = await database_1.prisma.driver.findMany({
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
        if (!d.currentLatitude || !d.currentLongitude)
            return false;
        const dist = (0, shared_utils_1.calculateDistanceKm)({ latitude: lat, longitude: lng }, { latitude: d.currentLatitude, longitude: d.currentLongitude });
        return dist <= radiusKm;
    })
        .sort((a, b) => {
        const distA = (0, shared_utils_1.calculateDistanceKm)({ latitude: lat, longitude: lng }, { latitude: a.currentLatitude, longitude: a.currentLongitude });
        const distB = (0, shared_utils_1.calculateDistanceKm)({ latitude: lat, longitude: lng }, { latitude: b.currentLatitude, longitude: b.currentLongitude });
        return distA - distB;
    });
}
async function findPricingRule(tenantId, vehicleType, lat, lng) {
    // Check zone-specific pricing first
    const zones = await database_1.prisma.zone.findMany({ where: { tenantId, isActive: true } });
    for (const zone of zones) {
        const polygon = zone.polygon;
        if ((0, shared_utils_1.isPointInPolygon)({ latitude: lat, longitude: lng }, polygon)) {
            const zonePricing = await database_1.prisma.pricingRule.findFirst({
                where: { tenantId, zoneId: zone.id, vehicleType, isActive: true },
            });
            if (zonePricing)
                return zonePricing;
        }
    }
    // Fall back to default pricing (no zone)
    const defaultPricing = await database_1.prisma.pricingRule.findFirst({
        where: { tenantId, zoneId: null, vehicleType, isActive: true },
    });
    if (!defaultPricing) {
        throw new ApiError_1.ApiError(`No pricing configured for ${vehicleType}. Please configure pricing in admin panel.`, shared_constants_1.HTTP_STATUS.BAD_REQUEST, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    return defaultPricing;
}
async function getActiveSurgeMultiplier(tenantId, lat, lng) {
    const now = new Date();
    const surges = await database_1.prisma.surgePricing.findMany({
        where: {
            tenantId,
            isActive: true,
            startTime: { lte: now },
            endTime: { gte: now },
        },
        include: { zone: true },
    });
    for (const surge of surges) {
        if (!surge.zone)
            return surge.multiplier; // Global surge
        const polygon = surge.zone.polygon;
        if ((0, shared_utils_1.isPointInPolygon)({ latitude: lat, longitude: lng }, polygon)) {
            return surge.multiplier;
        }
    }
    return 1;
}
async function validatePromoCode(tenantId, code) {
    const now = new Date();
    return database_1.prisma.promotion.findFirst({
        where: {
            tenantId,
            code: code.toUpperCase(),
            isActive: true,
            validFrom: { lte: now },
            validUntil: { gte: now },
            OR: [
                { usageLimit: null },
                { usageLimit: { gt: database_1.prisma.promotion.fields.usageCount } },
            ],
        },
    });
}
async function getBookingForDriver(bookingId, tenantId, driverUserId) {
    const driver = await database_1.prisma.driver.findUnique({ where: { userId: driverUserId }, select: { id: true } });
    if (!driver)
        throw new ApiError_1.ApiError('Driver not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.DRIVER_NOT_FOUND);
    const booking = await database_1.prisma.booking.findFirst({
        where: { id: bookingId, tenantId, driverId: driver.id },
    });
    if (!booking)
        throw new ApiError_1.ApiError('Booking not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.BOOKING_NOT_FOUND);
    return booking;
}
async function getPassengerUserId(passengerId) {
    const p = await database_1.prisma.passenger.findUnique({ where: { id: passengerId }, select: { userId: true } });
    return p?.userId ?? '';
}
//# sourceMappingURL=bookings.service.js.map