// ============================================================
// modules/drivers/drivers.service.ts
// Driver lifecycle: register → upload docs → approve → online
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { cacheDel, cacheGet, cacheSet } from '../../config/redis';
import { createModuleLogger } from '../../config/logger';
import { ERROR_CODES, HTTP_STATUS, CACHE_KEYS, CACHE_TTL } from '@taxiflow/shared-constants';
import { buildPagination } from '@taxiflow/shared-utils';
import { ApiError } from '../../utils/ApiError';
import { addNotificationJob, addEmailJob } from '../../jobs/queues';
import type { Driver, VehicleType, DocumentType, DriverStatus } from '@taxiflow/shared-types';

const logger = createModuleLogger('drivers-service');

// ─── REGISTER DRIVER PROFILE ──────────────────────────────

interface RegisterDriverInput {
  tenantId: string;
  userId: string;
  licenseNumber: string;
  licenseExpiry: Date;
}

export async function registerDriverProfile(input: RegisterDriverInput): Promise<Driver> {
  const { tenantId, userId, licenseNumber, licenseExpiry } = input;

  const existing = await prisma.driver.findUnique({ where: { userId } });
  if (existing) {
    throw new ApiError('Driver profile already exists', HTTP_STATUS.CONFLICT, ERROR_CODES.VALIDATION_ERROR);
  }

  // Check driver limit for tenant's subscription plan
  const subscription = await prisma.tenantSubscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });

  if (subscription?.plan.maxDrivers !== null && subscription?.plan.maxDrivers !== undefined) {
    const currentDriverCount = await prisma.driver.count({
      where: { tenantId, status: { not: 'INACTIVE' } },
    });
    if (currentDriverCount >= subscription.plan.maxDrivers) {
      throw new ApiError(
        `Driver limit reached for your plan (${subscription.plan.maxDrivers} drivers). Please upgrade.`,
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.DRIVER_LIMIT_REACHED,
      );
    }
  }

  const driver = await prisma.driver.create({
    data: {
      id: uuidv4(),
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
  const adminUsers = await prisma.user.findMany({
    where: { tenantId, role: 'TENANT_ADMIN', status: 'ACTIVE' },
    select: { id: true, email: true, firstName: true },
  });

  for (const admin of adminUsers) {
    await addNotificationJob({
      tenantId,
      userId: admin.id,
      type: 'GENERAL',
      title: 'New Driver Registration',
      body: `${driver.user.firstName} ${driver.user.lastName} has registered as a driver.`,
    });
  }

  logger.info('Driver profile created', { driverId: driver.id, tenantId });
  return driver as unknown as Driver;
}

// ─── GET DRIVERS ──────────────────────────────────────────

interface GetDriversInput {
  tenantId: string;
  page: number;
  limit: number;
  status?: DriverStatus;
  onlineStatus?: string;
  search?: string;
}

export async function getDrivers(input: GetDriversInput) {
  const { tenantId, page, limit, status, onlineStatus, search } = input;

  const where = {
    tenantId,
    ...(status && { status }),
    ...(onlineStatus && { onlineStatus: onlineStatus as never }),
    ...(search && {
      user: {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      },
    }),
  };

  const pagination = buildPagination(page, limit);

  const [drivers, total] = await Promise.all([
    prisma.driver.findMany({
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
    prisma.driver.count({ where }),
  ]);

  return { drivers, pagination: { ...pagination, total } };
}

// ─── GET DRIVER BY ID ─────────────────────────────────────

export async function getDriverById(driverId: string, tenantId: string) {
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, tenantId },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
      vehicles: true,
      documents: true,
      _count: { select: { bookings: true } },
    },
  });

  if (!driver) {
    throw new ApiError('Driver not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.DRIVER_NOT_FOUND);
  }

  return driver;
}

// ─── APPROVE / REJECT DRIVER ──────────────────────────────

export async function approveDriver(
  driverId: string,
  tenantId: string,
  approvedByUserId: string,
): Promise<Driver> {
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, tenantId },
    include: { user: { select: { id: true, firstName: true, email: true } } },
  });

  if (!driver) throw new ApiError('Driver not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.DRIVER_NOT_FOUND);

  const updated = await prisma.driver.update({
    where: { id: driverId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: approvedByUserId,
    },
  });

  // Update user status to ACTIVE
  await prisma.user.update({
    where: { id: driver.userId },
    data: { status: 'ACTIVE' },
  });

  await addNotificationJob({
    tenantId,
    userId: driver.userId,
    type: 'DRIVER_APPROVED',
    title: 'Application Approved! 🎉',
    body: 'Your driver application has been approved. You can now go online and accept bookings.',
  });

  if (driver.user.email) {
    await addEmailJob({
      to: driver.user.email,
      subject: 'Your Driver Application Has Been Approved',
      template: 'driver-approved',
      variables: { firstName: driver.user.firstName },
    });
  }

  logger.info('Driver approved', { driverId, approvedByUserId });
  return updated as unknown as Driver;
}

export async function rejectDriver(
  driverId: string,
  tenantId: string,
  reason: string,
): Promise<Driver> {
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, tenantId },
    include: { user: { select: { id: true, firstName: true, email: true } } },
  });

  if (!driver) throw new ApiError('Driver not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.DRIVER_NOT_FOUND);

  const updated = await prisma.driver.update({
    where: { id: driverId },
    data: { status: 'REJECTED' },
  });

  await addNotificationJob({
    tenantId,
    userId: driver.userId,
    type: 'DRIVER_REJECTED',
    title: 'Application Update',
    body: `Your driver application was not approved. Reason: ${reason}`,
  });

  if (driver.user.email) {
    await addEmailJob({
      to: driver.user.email,
      subject: 'Update on Your Driver Application',
      template: 'driver-rejected',
      variables: { firstName: driver.user.firstName, reason },
    });
  }

  logger.info('Driver rejected', { driverId, reason });
  return updated as unknown as Driver;
}

export async function suspendDriver(
  driverId: string,
  tenantId: string,
  reason: string,
): Promise<Driver> {
  const driver = await prisma.driver.findFirst({ where: { id: driverId, tenantId } });
  if (!driver) throw new ApiError('Driver not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.DRIVER_NOT_FOUND);

  const updated = await prisma.driver.update({
    where: { id: driverId },
    data: { status: 'SUSPENDED', onlineStatus: 'OFFLINE', suspendedAt: new Date(), suspensionReason: reason },
  });

  await prisma.user.update({ where: { id: driver.userId }, data: { status: 'SUSPENDED' } });

  logger.info('Driver suspended', { driverId, reason });
  return updated as unknown as Driver;
}

// ─── DRIVER ONLINE STATUS ─────────────────────────────────

export async function setDriverOnlineStatus(
  userId: string,
  tenantId: string,
  goOnline: boolean,
): Promise<{ onlineStatus: string }> {
  const driver = await prisma.driver.findUnique({ where: { userId } });

  if (!driver || driver.tenantId !== tenantId) {
    throw new ApiError('Driver not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.DRIVER_NOT_FOUND);
  }

  if (driver.status !== 'APPROVED') {
    throw new ApiError('Driver must be approved to go online', HTTP_STATUS.FORBIDDEN, ERROR_CODES.DRIVER_NOT_APPROVED);
  }

  const newStatus = goOnline ? 'ONLINE' : 'OFFLINE';

  await prisma.driver.update({
    where: { id: driver.id },
    data: { onlineStatus: newStatus },
  });

  // Update online drivers cache
  await cacheDel(CACHE_KEYS.onlineDrivers(tenantId));

  logger.info('Driver status changed', { driverId: driver.id, newStatus });
  return { onlineStatus: newStatus };
}

// ─── DRIVER EARNINGS ──────────────────────────────────────

export async function getDriverEarnings(driverId: string, tenantId: string, periodDays: number = 7) {
  const driver = await prisma.driver.findFirst({ where: { id: driverId, tenantId } });
  if (!driver) throw new ApiError('Driver not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.DRIVER_NOT_FOUND);

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - periodDays);

  const completedBookings = await prisma.booking.findMany({
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
  const byDay = completedBookings.reduce<Record<string, { trips: number; earnings: number }>>((acc, b) => {
    const day = b.completedAt?.toISOString().split('T')[0] ?? 'unknown';
    if (!acc[day]) acc[day] = { trips: 0, earnings: 0 };
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

// ─── VEHICLES ─────────────────────────────────────────────

interface AddVehicleInput {
  tenantId: string;
  driverUserId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  vehicleType: VehicleType;
  seats: number;
  insuranceExpiry: Date;
  motExpiry: Date;
}

export async function addVehicle(input: AddVehicleInput) {
  const driver = await prisma.driver.findUnique({
    where: { userId: input.driverUserId },
    select: { id: true, tenantId: true },
  });

  if (!driver || driver.tenantId !== input.tenantId) {
    throw new ApiError('Driver not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.DRIVER_NOT_FOUND);
  }

  // Check plate uniqueness within tenant
  const existing = await prisma.vehicle.findUnique({
    where: { tenantId_licensePlate: { tenantId: input.tenantId, licensePlate: input.licensePlate.toUpperCase() } },
  });
  if (existing) {
    throw new ApiError('License plate already registered', HTTP_STATUS.CONFLICT, ERROR_CODES.VALIDATION_ERROR);
  }

  return prisma.vehicle.create({
    data: {
      id: uuidv4(),
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

export async function saveDocumentRecord(
  tenantId: string,
  driverUserId: string,
  type: DocumentType,
  fileUrl: string,
  expiryDate?: Date,
) {
  const driver = await prisma.driver.findUnique({
    where: { userId: driverUserId },
    select: { id: true, tenantId: true },
  });

  if (!driver || driver.tenantId !== tenantId) {
    throw new ApiError('Driver not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.DRIVER_NOT_FOUND);
  }

  return prisma.driverDocument.create({
    data: {
      id: uuidv4(),
      tenantId,
      driverId: driver.id,
      type,
      fileUrl,
      expiryDate: expiryDate ?? null,
      status: 'PENDING',
    },
  });
}

export async function verifyDocument(
  documentId: string,
  tenantId: string,
  verifiedByUserId: string,
  approved: boolean,
  rejectionReason?: string,
) {
  const doc = await prisma.driverDocument.findFirst({ where: { id: documentId, tenantId } });
  if (!doc) throw new ApiError('Document not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);

  return prisma.driverDocument.update({
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

export async function getOnlineDrivers(tenantId: string) {
  return prisma.driver.findMany({
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
