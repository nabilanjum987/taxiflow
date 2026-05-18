export declare function createPaymentIntent(bookingId: string, tenantId: string): Promise<{
    clientSecret: string | null;
    amount: number;
    currency: any;
}>;
export declare function confirmPayment(bookingId: string, tenantId: string, stripePaymentIntentId: string): Promise<any>;
export declare function refundPayment(bookingId: string, tenantId: string, reason: string, amountToRefund?: number): Promise<any>;
export declare function getPaymentHistory(tenantId: string, page: number, limit: number): Promise<{
    payments: any;
    pagination: {
        total: any;
        page: number;
        limit: number;
        skip: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}>;
export declare function processDriverPayout(driverId: string, tenantId: string, periodStart: Date, periodEnd: Date): Promise<any>;
//# sourceMappingURL=payments.service.d.ts.map