export declare function submitRating(bookingId: string, tenantId: string, ratedByUserId: string, score: number, comment?: string): Promise<any>;
export declare function getDriverRatings(driverId: string, tenantId: string, page?: number, limit?: number): Promise<{
    averageRating: any;
    ratings: any;
}>;
//# sourceMappingURL=ratings.service.d.ts.map