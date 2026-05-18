import type { Driver, VehicleType, DocumentType, DriverStatus } from '@taxiflow/shared-types';
interface RegisterDriverInput {
    tenantId: string;
    userId: string;
    licenseNumber: string;
    licenseExpiry: Date;
}
export declare function registerDriverProfile(input: RegisterDriverInput): Promise<Driver>;
interface GetDriversInput {
    tenantId: string;
    page: number;
    limit: number;
    status?: DriverStatus;
    onlineStatus?: string;
    search?: string;
}
export declare function getDrivers(input: GetDriversInput): Promise<{
    drivers: any;
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
export declare function getDriverById(driverId: string, tenantId: string): Promise<any>;
export declare function approveDriver(driverId: string, tenantId: string, approvedByUserId: string): Promise<Driver>;
export declare function rejectDriver(driverId: string, tenantId: string, reason: string): Promise<Driver>;
export declare function suspendDriver(driverId: string, tenantId: string, reason: string): Promise<Driver>;
export declare function setDriverOnlineStatus(userId: string, tenantId: string, goOnline: boolean): Promise<{
    onlineStatus: string;
}>;
export declare function getDriverEarnings(driverId: string, tenantId: string, periodDays?: number): Promise<{
    driverId: string;
    periodDays: number;
    totalEarnings: number;
    totalTrips: any;
    allTimeEarnings: any;
    allTimeTrips: any;
    rating: any;
    breakdown: any[];
    recentBookings: any;
}>;
interface AddVehicleInput {
    tenantId: string;
    driverUserId: string;
    make: string;
    model: string;
    year: number;
    color: string;
    licensePlate: string;
    vehicleType: VehicleType;
    seats: number;
    insuranceExpiry: Date;
    motExpiry: Date;
}
export declare function addVehicle(input: AddVehicleInput): Promise<any>;
export declare function saveDocumentRecord(tenantId: string, driverUserId: string, type: DocumentType, fileUrl: string, expiryDate?: Date): Promise<any>;
export declare function verifyDocument(documentId: string, tenantId: string, verifiedByUserId: string, approved: boolean, rejectionReason?: string): Promise<any>;
export declare function getOnlineDrivers(tenantId: string): Promise<any>;
export {};
//# sourceMappingURL=drivers.service.d.ts.map