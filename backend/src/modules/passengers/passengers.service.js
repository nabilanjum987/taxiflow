"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPassengerProfile = getPassengerProfile;
exports.updatePassengerProfile = updatePassengerProfile;
exports.addSavedAddress = addSavedAddress;
exports.deleteSavedAddress = deleteSavedAddress;
exports.getPassengers = getPassengers;
// modules/passengers/passengers.service.ts
const uuid_1 = require("uuid");
const database_1 = require("../../config/database");
const logger_1 = require("../../config/logger");
const shared_constants_1 = require("@taxiflow/shared-constants");
const shared_utils_1 = require("@taxiflow/shared-utils");
const ApiError_1 = require("../../utils/ApiError");
const logger = (0, logger_1.createModuleLogger)('passengers-service');
async function getPassengerProfile(userId, tenantId) {
    const passenger = await database_1.prisma.passenger.findUnique({
        where: { userId },
        include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true, createdAt: true } },
            savedAddresses: true,
            _count: { select: { bookings: true } },
        },
    });
    if (!passenger || passenger.tenantId !== tenantId) {
        throw new ApiError_1.ApiError('Passenger not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.NOT_FOUND);
    }
    return passenger;
}
async function updatePassengerProfile(userId, tenantId, data) {
    const passenger = await database_1.prisma.passenger.findUnique({ where: { userId }, select: { id: true, tenantId: true } });
    if (!passenger || passenger.tenantId !== tenantId)
        throw new ApiError_1.ApiError('Not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.NOT_FOUND);
    return database_1.prisma.user.update({
        where: { id: userId },
        data,
        select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
    });
}
async function addSavedAddress(userId, tenantId, input) {
    const passenger = await database_1.prisma.passenger.findUnique({ where: { userId }, select: { id: true, tenantId: true } });
    if (!passenger || passenger.tenantId !== tenantId)
        throw new ApiError_1.ApiError('Not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.NOT_FOUND);
    return database_1.prisma.savedAddress.create({
        data: { id: (0, uuid_1.v4)(), passengerId: passenger.id, ...input },
    });
}
async function deleteSavedAddress(addressId, userId, tenantId) {
    const passenger = await database_1.prisma.passenger.findUnique({ where: { userId }, select: { id: true, tenantId: true } });
    if (!passenger || passenger.tenantId !== tenantId)
        throw new ApiError_1.ApiError('Not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.NOT_FOUND);
    const address = await database_1.prisma.savedAddress.findFirst({ where: { id: addressId, passengerId: passenger.id } });
    if (!address)
        throw new ApiError_1.ApiError('Address not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.NOT_FOUND);
    await database_1.prisma.savedAddress.delete({ where: { id: addressId } });
}
async function getPassengers(tenantId, page, limit, search) {
    const where = {
        tenantId,
        ...(search && {
            user: {
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } },
                ],
            },
        }),
    };
    const pagination = (0, shared_utils_1.buildPagination)(page, limit);
    const [passengers, total] = await Promise.all([
        database_1.prisma.passenger.findMany({
            where,
            skip: pagination.skip,
            take: pagination.limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true, createdAt: true } },
                _count: { select: { bookings: true } },
            },
        }),
        database_1.prisma.passenger.count({ where }),
    ]);
    return { passengers, pagination: { ...pagination, total } };
}
//# sourceMappingURL=passengers.service.js.map