interface CreatePromoInput {
    tenantId: string;
    code: string;
    description: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    minimumFare?: number;
    maximumDiscount?: number;
    usageLimit?: number;
    perUserLimit?: number;
    validFrom: Date;
    validUntil: Date;
}
export declare function createPromotion(input: CreatePromoInput): Promise<any>;
export declare function getPromotions(tenantId: string, page: number, limit: number): Promise<{
    promos: any;
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
export declare function validatePromoCode(tenantId: string, code: string, fare: number): Promise<{
    valid: boolean;
    discount: number;
    promo: any;
}>;
export declare function togglePromotion(promoId: string, tenantId: string, isActive: boolean): Promise<any>;
export {};
//# sourceMappingURL=promotions.service.d.ts.map