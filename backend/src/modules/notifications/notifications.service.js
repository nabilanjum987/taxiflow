"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserNotifications = getUserNotifications;
exports.markAsRead = markAsRead;
exports.markAllAsRead = markAllAsRead;
exports.getUnreadCount = getUnreadCount;
// modules/notifications/notifications.service.ts
const database_1 = require("../../config/database");
const logger_1 = require("../../config/logger");
const shared_constants_1 = require("@taxiflow/shared-constants");
const shared_utils_1 = require("@taxiflow/shared-utils");
const ApiError_1 = require("../../utils/ApiError");
const logger = (0, logger_1.createModuleLogger)('notifications-service');
async function getUserNotifications(userId, tenantId, page, limit, unreadOnly = false) {
    const where = {
        userId,
        tenantId,
        ...(unreadOnly && { isRead: false }),
    };
    const pagination = (0, shared_utils_1.buildPagination)(page, limit);
    const [notifications, total, unreadCount] = await Promise.all([
        database_1.prisma.notification.findMany({
            where,
            skip: pagination.skip,
            take: pagination.limit,
            orderBy: { sentAt: 'desc' },
        }),
        database_1.prisma.notification.count({ where }),
        database_1.prisma.notification.count({ where: { userId, tenantId, isRead: false } }),
    ]);
    return { notifications, pagination: { ...pagination, total }, unreadCount };
}
async function markAsRead(notificationId, userId, tenantId) {
    const notification = await database_1.prisma.notification.findFirst({ where: { id: notificationId, userId, tenantId } });
    if (!notification)
        throw new ApiError_1.ApiError('Notification not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.NOT_FOUND);
    return database_1.prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true, readAt: new Date() },
    });
}
async function markAllAsRead(userId, tenantId) {
    const result = await database_1.prisma.notification.updateMany({
        where: { userId, tenantId, isRead: false },
        data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
}
async function getUnreadCount(userId, tenantId) {
    const count = await database_1.prisma.notification.count({ where: { userId, tenantId, isRead: false } });
    return { unreadCount: count };
}
//# sourceMappingURL=notifications.service.js.map