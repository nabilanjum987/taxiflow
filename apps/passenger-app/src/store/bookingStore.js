"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useBookingStore = void 0;
// src/store/bookingStore.ts
const zustand_1 = require("zustand");
exports.useBookingStore = (0, zustand_1.create)((set) => ({
    activeBooking: null,
    driverLocation: null,
    fareEstimate: null,
    setActiveBooking: (booking) => set({ activeBooking: booking, driverLocation: null }),
    updateBookingStatus: (bookingId, status) => set((state) => ({
        activeBooking: state.activeBooking?.id === bookingId
            ? { ...state.activeBooking, status: status }
            : state.activeBooking,
    })),
    setDriverLocation: (location) => set({ driverLocation: location }),
    setFareEstimate: (estimate) => set({ fareEstimate: estimate }),
    clearBooking: () => set({ activeBooking: null, driverLocation: null, fareEstimate: null }),
}));
//# sourceMappingURL=bookingStore.js.map