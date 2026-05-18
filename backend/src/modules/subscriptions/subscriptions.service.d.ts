export declare function getSubscriptionStatus(tenantId: string): Promise<{
    subscription: any;
    invoices: any;
    isActive: boolean;
    daysUntilRenewal: number;
}>;
export declare function getAvailablePlans(): Promise<any>;
export declare function changePlan(tenantId: string, newPlanSlug: string): Promise<void>;
export declare function cancelSubscription(tenantId: string, cancelImmediately?: boolean): Promise<void>;
export declare function createCheckoutSession(input: {
    planSlug: string;
    companyName: string;
    adminEmail: string;
    adminPhone: string;
    adminFirstName: string;
    adminLastName: string;
    country: string;
    currency: string;
    timezone: string;
    successUrl: string;
    cancelUrl: string;
}): Promise<{
    sessionUrl: string;
}>;
export declare function createCustomerPortalSession(tenantId: string, returnUrl: string): Promise<string>;
//# sourceMappingURL=subscriptions.service.d.ts.map