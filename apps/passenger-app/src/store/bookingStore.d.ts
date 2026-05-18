import type { Booking } from '@taxiflow/shared-types';
interface DriverLocation {
    latitude: number;
    longitude: number;
    heading: number;
}
interface BookingState {
    activeBooking: Booking | null;
    driverLocation: DriverLocation | null;
    fareEstimate: {
        estimatedFare: number;
        currency: string;
        distanceKm: number;
        durationMinutes: number;
    } | null;
    setActiveBooking: (booking: Booking | null) => void;
    updateBookingStatus: (bookingId: string, status: string) => void;
    setDriverLocation: (location: DriverLocation) => void;
    setFareEstimate: (estimate: BookingState['fareEstimate']) => void;
    clearBooking: () => void;
}
export declare const useBookingStore: import("zustand").UseBoundStore<import("zustand").StoreApi<BookingState>>;
export {};
//# sourceMappingURL=bookingStore.d.ts.map