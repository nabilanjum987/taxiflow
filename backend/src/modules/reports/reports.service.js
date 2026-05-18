"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = getDashboardStats;
exports.getRevenueReport = getRevenueReport;
exports.getBookingReport = getBookingReport;
// modules/reports/reports.service.ts
const database_1 = require("../../config/database");
const logger_1 = require("../../config/logger");
const shared_utils_1 = require("@taxiflow/shared-utils");
const logger = (0, logger_1.createModuleLogger)('reports-service');
async function getDashboardStats(tenantId) {
    const today = new Date();
    const todayStart = (0, shared_utils_1.startOfDay)(today);
    const todayEnd = (0, shared_utils_1.endOfDay)(today);
    const weekAgo = (0, shared_utils_1.addDays)(today, -7);
    const [todayBookings, todayRevenue, activeDrivers, onlineDrivers, totalPassengers, weeklyBookings, avgRating, pendingDriverApprovals,] = await Promise.all([
        database_1.prisma.booking.count({ where: { tenantId, createdAt: { gte: todayStart, lte: todayEnd } } }),
        database_1.prisma.payment.aggregate({
            where: { tenantId, status: 'PAID', processedAt: { gte: todayStart, lte: todayEnd } },
            _sum: { amount: true },
        }),
        database_1.prisma.driver.count({ where: { tenantId, status: 'APPROVED' } }),
        database_1.prisma.driver.count({ where: { tenantId, onlineStatus: { in: ['ONLINE', 'ON_TRIP'] } } }),
        database_1.prisma.passenger.count({ where: { tenantId } }),
        database_1.prisma.booking.groupBy({
            by: ['status'],
            where: { tenantId, createdAt: { gte: weekAgo } },
            _count: { id: true },
        }),
        database_1.prisma.rating.aggregate({
            where: { tenantId, ratingType: 'PASSENGER_RATES_DRIVER' },
            _avg: { score: true },
        }),
        database_1.prisma.driver.count({ where: { tenantId, status: 'PENDING_APPROVAL' } }),
    ]);
    const tenant = await database_1.prisma.tenant.findUnique({ where: { id: tenantId }, select: { currency: true } });
    const weeklyByStatus = weeklyBookings.reduce((acc, g) => {
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
async function getRevenueReport(tenantId, days = 30) {
    const fromDate = (0, shared_utils_1.addDays)(new Date(), -days);
    const payments = await database_1.prisma.payment.findMany({
        where: { tenantId, status: 'PAID', processedAt: { gte: fromDate } },
        select: { amount: true, processedAt: true, method: true },
        orderBy: { processedAt: 'asc' },
    });
    // Group by day
    const byDay = payments.reduce((acc, p) => {
        const day = p.processedAt?.toISOString().split('T')[0] ?? 'unknown';
        if (!acc[day])
            acc[day] = { revenue: 0, transactions: 0 };
        acc[day].revenue += p.amount;
        acc[day].transactions += 1;
        return acc;
    }, {});
    // By payment method
    const byMethod = payments.reduce((acc, p) => {
        acc[p.method] = (acc[p.method] ?? 0) + p.amount;
        return acc;
    }, {});
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const tenant = await database_1.prisma.tenant.findUnique({ where: { id: tenantId }, select: { currency: true } });
    return {
        period: { days, from: fromDate },
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        currency: tenant?.currency ?? 'GBP',
        totalTransactions: payments.length,
        byDay: Object.entries(byDay).map(([date, data]) => ({ date, ...data })),
        byMethod,
    };
}
async function getBookingReport(tenantId, days = 30) {
    const fromDate = (0, shared_utils_1.addDays)(new Date(), -days);
    const [bookings, cancelledCount, completedCount, avgDuration] = await Promise.all([
        database_1.prisma.booking.groupBy({
            by: ['status'],
            where: { tenantId, createdAt: { gte: fromDate } },
            _count: { id: true },
        }),
        database_1.prisma.booking.count({ where: { tenantId, status: 'CANCELLED', createdAt: { gte: fromDate } } }),
        database_1.prisma.booking.count({ where: { tenantId, status: 'COMPLETED', createdAt: { gte: fromDate } } }),
        database_1.prisma.booking.aggregate({
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
        byStatus: bookings.reduce((acc, g) => {
            acc[g.status] = g._count.id;
            return acc;
        }, {}),
    };
}
//# sourceMappingURL=reports.service.js.map