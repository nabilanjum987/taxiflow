// modules/passengers/passengers.service.ts
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { createModuleLogger } from '../../config/logger';
import { ERROR_CODES, HTTP_STATUS } from '@taxiflow/shared-constants';
import { buildPagination } from '@taxiflow/shared-utils';
import { ApiError } from '../../utils/ApiError';

const logger = createModuleLogger('passengers-service');

export async function getPassengerProfile(userId: string, tenantId: string) {
  const passenger = await prisma.passenger.findUnique({
    where: { userId },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true, createdAt: true } },
      savedAddresses: true,
      _count: { select: { bookings: true } },
    },
  });

  if (!passenger || passenger.tenantId !== tenantId) {
    throw new ApiError('Passenger not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return passenger;
}

export async function updatePassengerProfile(
  userId: string,
  tenantId: string,
  data: { firstName?: string; lastName?: string; email?: string; avatarUrl?: string },
) {
  const passenger = await prisma.passenger.findUnique({ where: { userId }, select: { id: true, tenantId: true } });
  if (!passenger || passenger.tenantId !== tenantId) throw new ApiError('Not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);

  return prisma.user.update({
    where: { id: userId },
    data,
    select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
  });
}

export async function addSavedAddress(
  userId: string,
  tenantId: string,
  input: { label: string; fullAddress: string; latitude: number; longitude: number },
) {
  const passenger = await prisma.passenger.findUnique({ where: { userId }, select: { id: true, tenantId: true } });
  if (!passenger || passenger.tenantId !== tenantId) throw new ApiError('Not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);

  return prisma.savedAddress.create({
    data: { id: uuidv4(), passengerId: passenger.id, ...input },
  });
}

export async function deleteSavedAddress(addressId: string, userId: string, tenantId: string) {
  const passenger = await prisma.passenger.findUnique({ where: { userId }, select: { id: true, tenantId: true } });
  if (!passenger || passenger.tenantId !== tenantId) throw new ApiError('Not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);

  const address = await prisma.savedAddress.findFirst({ where: { id: addressId, passengerId: passenger.id } });
  if (!address) throw new ApiError('Address not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);

  await prisma.savedAddress.delete({ where: { id: addressId } });
}

export async function getPassengers(tenantId: string, page: number, limit: number, search?: string) {
  const where = {
    tenantId,
    ...(search && {
      user: {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search } },
        ],
      },
    }),
  };

  const pagination = buildPagination(page, limit);
  const [passengers, total] = await Promise.all([
    prisma.passenger.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true, createdAt: true } },
        _count: { select: { bookings: true } },
      },
    }),
    prisma.passenger.count({ where }),
  ]);

  return { passengers, pagination: { ...pagination, total } };
}
