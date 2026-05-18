export declare function getDashboardStats(tenantId: string): Promise<{
    today: {
        bookings: any;
        revenue: any;
        currency: any;
    };
    drivers: {
        active: any;
        online: any;
        pendingApproval: any;
    };
    passengers: {
        total: any;
    };
    weeklyBookings: any;
    averageRating: number;
}>;
export declare function getRevenueReport(tenantId: string, days?: number): Promise<{
    period: {
        days: number;
        from: Date;
    };
    totalRevenue: number;
    currency: any;
    totalTransactions: any;
    byDay: any[];
    byMethod: any;
}>;
export declare function getBookingReport(tenantId: string, days?: number): Promise<{
    period: {
        days: number;
        from: Date;
    };
    totalBookings: any;
    completedBookings: any;
    cancelledBookings: any;
    completionRate: number;
    cancellationRate: number;
    averageDurationMinutes: number;
    averageDistanceKm: number;
    byStatus: any;
}>;
//# sourceMappingURL=reports.service.d.ts.map