export declare function getPassengerProfile(userId: string, tenantId: string): Promise<any>;
export declare function updatePassengerProfile(userId: string, tenantId: string, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string;
}): Promise<any>;
export declare function addSavedAddress(userId: string, tenantId: string, input: {
    label: string;
    fullAddress: string;
    latitude: number;
    longitude: number;
}): Promise<any>;
export declare function deleteSavedAddress(addressId: string, userId: string, tenantId: string): Promise<void>;
export declare function getPassengers(tenantId: string, page: number, limit: number, search?: string): Promise<{
    passengers: any;
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
//# sourceMappingURL=passengers.service.d.ts.map