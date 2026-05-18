// src/store/bookingStore.ts
import { create } from 'zustand';
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

export const useBookingStore = create<BookingState>((set) => ({
  activeBooking: null,
  driverLocation: null,
  fareEstimate: null,

  setActiveBooking: (booking) => set({ activeBooking: booking, driverLocation: null }),

  updateBookingStatus: (bookingId, status) =>
    set((state) => ({
      activeBooking:
        state.activeBooking?.id === bookingId
          ? { ...state.activeBooking, status: status as Booking['status'] }
          : state.activeBooking,
    })),

  setDriverLocation: (location) => set({ driverLocation: location }),

  setFareEstimate: (estimate) => set({ fareEstimate: estimate }),

  clearBooking: () => set({ activeBooking: null, driverLocation: null, fareEstimate: null }),
}));
