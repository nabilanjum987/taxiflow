// modules/notifications/notifications.service.ts
import { prisma } from '../../config/database';
import { createModuleLogger } from '../../config/logger';
import { ERROR_CODES, HTTP_STATUS } from '@taxiflow/shared-constants';
import { buildPagination } from '@taxiflow/shared-utils';
import { ApiError } from '../../utils/ApiError';

const logger = createModuleLogger('notifications-service');

export async function getUserNotifications(userId: string, tenantId: string, page: number, limit: number, unreadOnly = false) {
  const where = {
    userId,
    tenantId,
    ...(unreadOnly && { isRead: false }),
  };

  const pagination = buildPagination(page, limit);

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { sentAt: 'desc' },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, tenantId, isRead: false } }),
  ]);

  return { notifications, pagination: { ...pagination, total }, unreadCount };
}

export async function markAsRead(notificationId: string, userId: string, tenantId: string) {
  const notification = await prisma.notification.findFirst({ where: { id: notificationId, userId, tenantId } });
  if (!notification) throw new ApiError('Notification not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string, tenantId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, tenantId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return { updated: result.count };
}

export async function getUnreadCount(userId: string, tenantId: string) {
  const count = await prisma.notification.count({ where: { userId, tenantId, isRead: false } });
  return { unreadCount: count };
}
