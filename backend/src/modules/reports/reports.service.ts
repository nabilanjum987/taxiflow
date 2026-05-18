// modules/reports/reports.service.ts
import { prisma } from '../../config/database';
import { createModuleLogger } from '../../config/logger';
import { startOfDay, endOfDay, addDays } from '@taxiflow/shared-utils';

const logger = createModuleLogger('reports-service');

export async function getDashboardStats(tenantId: string) {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const weekAgo = addDays(today, -7);

  const [
    todayBookings,
    todayRevenue,
    activeDrivers,
    onlineDrivers,
    totalPassengers,
    weeklyBookings,
    avgRating,
    pendingDriverApprovals,
  ] = await Promise.all([
    prisma.booking.count({ where: { tenantId, createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.payment.aggregate({
      where: { tenantId, status: 'PAID', processedAt: { gte: todayStart, lte: todayEnd } },
      _sum: { amount: true },
    }),
    prisma.driver.count({ where: { tenantId, status: 'APPROVED' } }),
    prisma.driver.count({ where: { tenantId, onlineStatus: { in: ['ONLINE', 'ON_TRIP'] } } }),
    prisma.passenger.count({ where: { tenantId } }),
    prisma.booking.groupBy({
      by: ['status'],
      where: { tenantId, createdAt: { gte: weekAgo } },
      _count: { id: true },
    }),
    prisma.rating.aggregate({
      where: { tenantId, ratingType: 'PASSENGER_RATES_DRIVER' },
      _avg: { score: true },
    }),
    prisma.driver.count({ where: { tenantId, status: 'PENDING_APPROVAL' } }),
  ]);

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { currency: true } });

  const weeklyByStatus = weeklyBookings.reduce<Record<string, number>>((acc, g) => {
    acc[g.status] = g._count.id;
    return acc;
  }, {});

  return {
    today: {
      bookings: todayBookings,
      revenue: todayRevenue._sum.amount ?? 0,
      currency: tenant?.currency ?? 'GBP',
    },
    drivers: {
      active: activeDrivers,
      online: onlineDrivers,
      pendingApproval: pendingDriverApprovals,
    },
    passengers: { total: totalPassengers },
    weeklyBookings: weeklyByStatus,
    averageRating: Math.round((avgRating._avg.score ?? 0) * 10) / 10,
  };
}

export async function getRevenueReport(tenantId: string, days: number = 30) {
  const fromDate = addDays(new Date(), -days);

  const payments = await prisma.payment.findMany({
    where: { tenantId, status: 'PAID', processedAt: { gte: fromDate } },
    select: { amount: true, processedAt: true, method: true },
    orderBy: { processedAt: 'asc' },
  });

  // Group by day
  const byDay = payments.reduce<Record<string, { revenue: number; transactions: number }>>((acc, p) => {
    const day = p.processedAt?.toISOString().split('T')[0] ?? 'unknown';
    if (!acc[day]) acc[day] = { revenue: 0, transactions: 0 };
    acc[day].revenue += p.amount;
    acc[day].transactions += 1;
    return acc;
  }, {});

  // By payment method
  const byMethod = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.method] = (acc[p.method] ?? 0) + p.amount;
    return acc;
  }, {});

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { currency: true } });

  return {
    period: { days, from: fromDate },
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    currency: tenant?.currency ?? 'GBP',
    totalTransactions: payments.length,
    byDay: Object.entries(byDay).map(([date, data]) => ({ date, ...data })),
    byMethod,
  };
}

export async function getBookingReport(tenantId: string, days: number = 30) {
  const fromDate = addDays(new Date(), -days);

  const [bookings, cancelledCount, completedCount, avgDuration] = await Promise.all([
    prisma.booking.groupBy({
      by: ['status'],
      where: { tenantId, createdAt: { gte: fromDate } },
      _count: { id: true },
    }),
    prisma.booking.count({ where: { tenantId, status: 'CANCELLED', createdAt: { gte: fromDate } } }),
    prisma.booking.count({ where: { tenantId, status: 'COMPLETED', createdAt: { gte: fromDate } } }),
    prisma.booking.aggregate({
      where: { tenantId, status: 'COMPLETED', durationMinutes: { not: null }, createdAt: { gte: fromDate } },
      _avg: { durationMinutes: true, distanceKm: true },
    }),
  ]);

  const totalBookings = bookings.reduce((sum, g) => sum + g._count.id, 0);
  const completionRate = totalBookings > 0 ? Math.round((completedCount / totalBookings) * 100) : 0;
  const cancellationRate = totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0;

  return {
    period: { days, from: fromDate },
    totalBookings,
    completedBookings: completedCount,
    cancelledBookings: cancelledCount,
    completionRate,
    cancellationRate,
    averageDurationMinutes: Math.round(avgDuration._avg.durationMinutes ?? 0),
    averageDistanceKm: Math.round((avgDuration._avg.distanceKm ?? 0) * 10) / 10,
    byStatus: bookings.reduce<Record<string, number>>((acc, g) => {
      acc[g.status] = g._count.id;
      return acc;
    }, {}),
  };
}
