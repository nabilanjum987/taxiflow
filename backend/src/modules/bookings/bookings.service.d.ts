import type { Booking, VehicleType, PaymentMethod } from '@taxiflow/shared-types';
import type { Server as SocketIOServer } from 'socket.io';
interface FareEstimateInput {
    tenantId: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffLatitude: number;
    dropoffLongitude: number;
    vehicleType: VehicleType;
    promoCode?: string;
}
export declare function getFareEstimate(input: FareEstimateInput): Promise<{
    currency: any;
    vehicleType: VehicleType;
    estimatedFare: number;
    distanceKm: number;
    durationMinutes: number;
    breakdown: {
        baseFare: number;
        distanceFare: number;
        timeFare: number;
        bookingFee: number;
        surgeMultiplier: number;
        discount: number;
    };
}>;
interface CreateBookingInput {
    tenantId: string;
    passengerId: string;
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffAddress: string;
    dropoffLatitude: number;
    dropoffLongitude: number;
    vehicleType: VehicleType;
    paymentMethod: PaymentMethod;
    promoCode?: string;
    scheduledAt?: Date;
    notes?: string;
    corporateAccountId?: string;
}
export declare function createBooking(input: CreateBookingInput, io: SocketIOServer): Promise<Booking>;
export declare function acceptBooking(bookingId: string, tenantId: string, driverUserId: string, io: SocketIOServer): Promise<Booking>;
export declare function markDriverArrived(bookingId: string, tenantId: string, driverUserId: string, io: SocketIOServer): Promise<Booking>;
export declare function startRide(bookingId: string, tenantId: string, driverUserId: string, io: SocketIOServer): Promise<Booking>;
export declare function completeRide(bookingId: string, tenantId: string, driverUserId: string, io: SocketIOServer): Promise<Booking>;
export declare function cancelBooking(bookingId: string, tenantId: string, userId: string, reason: string, io: SocketIOServer): Promise<Booking>;
interface GetBookingsInput {
    tenantId: string;
    page: number;
    limit: number;
    status?: string;
    driverId?: string;
    passengerId?: string;
    dateFrom?: Date;
    dateTo?: Date;
}
export declare function getBookings(input: GetBookingsInput): Promise<{
    bookings: any;
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
export declare function getBookingById(bookingId: string, tenantId: string): Promise<Booking>;
export declare function manuallyAssignDriver(bookingId: string, tenantId: string, driverId: string, io: SocketIOServer): Promise<Booking>;
export {};
//# sourceMappingURL=bookings.service.d.ts.map