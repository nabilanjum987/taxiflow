"use strict";
// ============================================================
// modules/drivers/drivers.service.ts
// Driver lifecycle: register → upload docs → approve → online
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDriverProfile = registerDriverProfile;
exports.getDrivers = getDrivers;
exports.getDriverById = getDriverById;
exports.approveDriver = approveDriver;
exports.rejectDriver = rejectDriver;
exports.suspendDriver = suspendDriver;
exports.setDriverOnlineStatus = setDriverOnlineStatus;
exports.getDriverEarnings = getDriverEarnings;
exports.addVehicle = addVehicle;
exports.saveDocumentRecord = saveDocumentRecord;
exports.verifyDocument = verifyDocument;
exports.getOnlineDrivers = getOnlineDrivers;
const uuid_1 = require("uuid");
const database_1 = require("../../config/database");
const redis_1 = require("../../config/redis");
const logger_1 = require("../../config/logger");
const shared_constants_1 = require("@taxiflow/shared-constants");
const shared_utils_1 = require("@taxiflow/shared-utils");
const ApiError_1 = require("../../utils/ApiError");
const queues_1 = require("../../jobs/queues");
const logger = (0, logger_1.createModuleLogger)('drivers-service');
async function registerDriverProfile(input) {
    const { tenantId, userId, licenseNumber, licenseExpiry } = input;
    const existing = await database_1.prisma.driver.findUnique({ where: { userId } });
    if (existing) {
        throw new ApiError_1.ApiError('Driver profile already exists', shared_constants_1.HTTP_STATUS.CONFLICT, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    // Check driver limit for tenant's subscription plan
    const subscription = await database_1.prisma.tenantSubscription.findUnique({
        where: { tenantId },
        include: { plan: true },
    });
    if (subscription?.plan.maxDrivers !== null && subscription?.plan.maxDrivers !== undefined) {
        const currentDriverCount = await database_1.prisma.driver.count({
            where: { tenantId, status: { not: 'INACTIVE' } },
        });
        if (currentDriverCount >= subscription.plan.maxDrivers) {
            throw new ApiError_1.ApiError(`Driver limit reached for your plan (${subscription.plan.maxDrivers} drivers). Please upgrade.`, shared_constants_1.HTTP_STATUS.FORBIDDEN, shared_constants_1.ERROR_CODES.DRIVER_LIMIT_REACHED);
        }
    }
    const driver = await database_1.prisma.driver.create({
        data: {
            id: (0, uuid_1.v4)(),
            tenantId,
            userId,
            licenseNumber,
            licenseExpiry,
            status: 'PENDING_APPROVAL',
            onlineStatus: 'OFFLINE',
        },
        include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        },
    });
    // Notify admin
    const adminUsers = await database_1.prisma.user.findMany({
        where: { tenantId, role: 'TENANT_ADMIN', status: 'ACTIVE' },
        select: { id: true, email: true, firstName: true },
    });
    for (const admin of adminUsers) {
        await (0, queues_1.addNotificationJob)({
            tenantId,
            userId: admin.id,
            type: 'GENERAL',
            title: 'New Driver Registration',
            body: `${driver.user.firstName} ${driver.user.lastName} has registered as a driver.`,
        });
    }
    logger.info('Driver profile created', { driverId: driver.id, tenantId });
    return driver;
}
async function getDrivers(input) {
    const { tenantId, page, limit, status, onlineStatus, search } = input;
    const where = {
        tenantId,
        ...(status && { status }),
        ...(onlineStatus && { onlineStatus: onlineStatus }),
        ...(search && {
            user: {
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } },
                    { email: { contains: search, mode: 'insensitive' } },
                ],
            },
        }),
    };
    const pagination = (0, shared_utils_1.buildPagination)(page, limit);
    const [drivers, total] = await Promise.all([
        database_1.prisma.driver.findMany({
            where,
            skip: pagination.skip,
            take: pagination.limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
                vehicles: { where: { isActive: true } },
                _count: { select: { bookings: true } },
            },
        }),
        database_1.prisma.driver.count({ where }),
    ]);
    return { drivers, pagination: { ...pagination, total } };
}
// ─── GET DRIVER BY ID ─────────────────────────────────────
async function getDriverById(driverId, tenantId) {
    const driver = await database_1.prisma.driver.findFirst({
        where: { id: driverId, tenantId },
        include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
            vehicles: true,
            documents: true,
            _count: { select: { bookings: true } },
        },
    });
    if (!driver) {
        throw new ApiError_1.ApiError('Driver not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.DRIVER_NOT_FOUND);
    }
    return driver;
}
// ─── APPROVE / REJECT DRIVER ──────────────────────────────
async function approveDriver(driverId, tenantId, approvedByUserId) {
    const driver = await database_1.prisma.driver.findFirst({
        where: { id: driverId, tenantId },
        include: { user: { select: { id: true, firstName: true, email: true } } },
    });
    if (!driver)
        throw new ApiError_1.ApiError('Driver not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.DRIVER_NOT_FOUND);
    const updated = await database_1.prisma.driver.update({
        where: { id: driverId },
        data: {
            status: 'APPROVED',
            approvedAt: new Date(),
            approvedBy: approvedByUserId,
        },
    });
    // Update user status to ACTIVE
    await database_1.prisma.user.update({
        where: { id: driver.userId },
        data: { status: 'ACTIVE' },
    });
    await (0, queues_1.addNotificationJob)({
        tenantId,
        userId: driver.userId,
        type: 'DRIVER_APPROVED',
        title: 'Application Approved! 🎉',
        body: 'Your driver application has been approved. You can now go online and accept bookings.',
    });
    if (driver.user.email) {
        await (0, queues_1.addEmailJob)({
            to: driver.user.email,
            subject: 'Your Driver Application Has Been Approved',
            template: 'driver-approved',
            variables: { firstName: driver.user.firstName },
        });
    }
    logger.info('Driver approved', { driverId, approvedByUserId });
    return updated;
}
async function rejectDriver(driverId, tenantId, reason) {
    const driver = await database_1.prisma.driver.findFirst({
        where: { id: driverId, tenantId },
        include: { user: { select: { id: true, firstName: true, email: true } } },
    });
    if (!driver)
        throw new ApiError_1.ApiError('Driver not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.DRIVER_NOT_FOUND);
    const updated = await database_1.prisma.driver.update({
        where: { id: driverId },
        data: { status: 'REJECTED' },
    });
    await (0, queues_1.addNotificationJob)({
        tenantId,
        userId: driver.userId,
        type: 'DRIVER_REJECTED',
        title: 'Application Update',
        body: `Your driver application was not approved. Reason: ${reason}`,
    });
    if (driver.user.email) {
        await (0, queues_1.addEmailJob)({
            to: driver.user.email,
            subject: 'Update on Your Driver Application',
            template: 'driver-rejected',
            variables: { firstName: driver.user.firstName, reason },
        });
    }
    logger.info('Driver rejected', { driverId, reason });
    return updated;
}
async function suspendDriver(driverId, tenantId, reason) {
    const driver = await database_1.prisma.driver.findFirst({ where: { id: driverId, tenantId } });
    if (!driver)
        throw new ApiError_1.ApiError('Driver not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.DRIVER_NOT_FOUND);
    const updated = await database_1.prisma.driver.update({
        where: { id: driverId },
        data: { status: 'SUSPENDED', onlineStatus: 'OFFLINE', suspendedAt: new Date(), suspensionReason: reason },
    });
    await database_1.prisma.user.update({ where: { id: driver.userId }, data: { status: 'SUSPENDED' } });
    logger.info('Driver suspended', { driverId, reason });
    return updated;
}
// ─── DRIVER ONLINE STATUS ─────────────────────────────────
async function setDriverOnlineStatus(userId, tenantId, goOnline) {
    const driver = await database_1.prisma.driver.findUnique({ where: { userId } });
    if (!driver || driver.tenantId !== tenantId) {
        throw new ApiError_1.ApiError('Driver not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.DRIVER_NOT_FOUND);
    }
    if (driver.status !== 'APPROVED') {
        throw new ApiError_1.ApiError('Driver must be approved to go online', shared_constants_1.HTTP_STATUS.FORBIDDEN, shared_constants_1.ERROR_CODES.DRIVER_NOT_APPROVED);
    }
    const newStatus = goOnline ? 'ONLINE' : 'OFFLINE';
    await database_1.prisma.driver.update({
        where: { id: driver.id },
        data: { onlineStatus: newStatus },
    });
    // Update online drivers cache
    await (0, redis_1.cacheDel)(shared_constants_1.CACHE_KEYS.onlineDrivers(tenantId));
    logger.info('Driver status changed', { driverId: driver.id, newStatus });
    return { onlineStatus: newStatus };
}
// ─── DRIVER EARNINGS ──────────────────────────────────────
async function getDriverEarnings(driverId, tenantId, periodDays = 7) {
    const driver = await database_1.prisma.driver.findFirst({ where: { id: driverId, tenantId } });
    if (!driver)
        throw new ApiError_1.ApiError('Driver not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.DRIVER_NOT_FOUND);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - periodDays);
    const completedBookings = await database_1.prisma.booking.findMany({
        where: {
            tenantId,
            driverId,
            status: 'COMPLETED',
            completedAt: { gte: fromDate },
        },
        select: {
            id: true,
            actualFare: true,
            completedAt: true,
            pickupAddress: true,
            dropoffAddress: true,
        },
        orderBy: { completedAt: 'desc' },
    });
    const totalEarnings = completedBookings.reduce((sum, b) => sum + ((b.actualFare ?? 0) * 0.8), 0);
    const totalTrips = completedBookings.length;
    // Group by day
    const byDay = completedBookings.reduce((acc, b) => {
        const day = b.completedAt?.toISOString().split('T')[0] ?? 'unknown';
        if (!acc[day])
            acc[day] = { trips: 0, earnings: 0 };
        acc[day].trips += 1;
        acc[day].earnings += (b.actualFare ?? 0) * 0.8;
        return acc;
    }, {});
    return {
        driverId,
        periodDays,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        totalTrips,
        allTimeEarnings: driver.totalEarnings,
        allTimeTrips: driver.totalTrips,
        rating: driver.rating,
        breakdown: Object.entries(byDay).map(([date, data]) => ({ date, ...data })),
        recentBookings: completedBookings.slice(0, 10),
    };
}
async function addVehicle(input) {
    const driver = await database_1.prisma.driver.findUnique({
        where: { userId: input.driverUserId },
        select: { id: true, tenantId: true },
    });
    if (!driver || driver.tenantId !== input.tenantId) {
        throw new ApiError_1.ApiError('Driver not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.DRIVER_NOT_FOUND);
    }
    // Check plate uniqueness within tenant
    const existing = await database_1.prisma.vehicle.findUnique({
        where: { tenantId_licensePlate: { tenantId: input.tenantId, licensePlate: input.licensePlate.toUpperCase() } },
    });
    if (existing) {
        throw new ApiError_1.ApiError('License plate already registered', shared_constants_1.HTTP_STATUS.CONFLICT, shared_constants_1.ERROR_CODES.VALIDATION_ERROR);
    }
    return database_1.prisma.vehicle.create({
        data: {
            id: (0, uuid_1.v4)(),
            tenantId: input.tenantId,
            driverId: driver.id,
            make: input.make,
            model: input.model,
            year: input.year,
            color: input.color,
            licensePlate: input.licensePlate.toUpperCase(),
            vehicleType: input.vehicleType,
            seats: input.seats,
            insuranceExpiry: input.insuranceExpiry,
            motExpiry: input.motExpiry,
        },
    });
}
// ─── DOCUMENTS ────────────────────────────────────────────
async function saveDocumentRecord(tenantId, driverUserId, type, fileUrl, expiryDate) {
    const driver = await database_1.prisma.driver.findUnique({
        where: { userId: driverUserId },
        select: { id: true, tenantId: true },
    });
    if (!driver || driver.tenantId !== tenantId) {
        throw new ApiError_1.ApiError('Driver not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.DRIVER_NOT_FOUND);
    }
    return database_1.prisma.driverDocument.create({
        data: {
            id: (0, uuid_1.v4)(),
            tenantId,
            driverId: driver.id,
            type,
            fileUrl,
            expiryDate: expiryDate ?? null,
            status: 'PENDING',
        },
    });
}
async function verifyDocument(documentId, tenantId, verifiedByUserId, approved, rejectionReason) {
    const doc = await database_1.prisma.driverDocument.findFirst({ where: { id: documentId, tenantId } });
    if (!doc)
        throw new ApiError_1.ApiError('Document not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.NOT_FOUND);
    return database_1.prisma.driverDocument.update({
        where: { id: documentId },
        data: {
            status: approved ? 'APPROVED' : 'REJECTED',
            verifiedBy: verifiedByUserId,
            verifiedAt: new Date(),
            rejectionReason: rejectionReason ?? null,
        },
    });
}
// ─── ONLINE DRIVERS (for dispatcher map) ─────────────────
async function getOnlineDrivers(tenantId) {
    return database_1.prisma.driver.findMany({
        where: {
            tenantId,
            onlineStatus: { in: ['ONLINE', 'ON_TRIP'] },
            currentLatitude: { not: null },
            currentLongitude: { not: null },
        },
        select: {
            id: true,
            userId: true,
            onlineStatus: true,
            currentLatitude: true,
            currentLongitude: true,
            currentHeading: true,
            rating: true,
            user: { select: { firstName: true, lastName: true, phone: true, avatarUrl: true } },
            vehicles: { where: { isActive: true }, take: 1 },
        },
    });
}
//# sourceMappingURL=drivers.service.js.map