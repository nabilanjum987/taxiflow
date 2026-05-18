import type { AuthUser } from '@taxiflow/shared-types';
interface AuthState {
    user: AuthUser | null;
    tenantId: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    setAuth: (user: AuthUser, token: string, tenantId: string) => Promise<void>;
    clearAuth: () => Promise<void>;
    loadFromStorage: () => Promise<void>;
}
export declare const useAuthStore: import("zustand").UseBoundStore<import("zustand").StoreApi<AuthState>>;
import type { Booking } from '@taxiflow/shared-types';
interface DriverState {
    isOnline: boolean;
    activeBooking: Booking | null;
    incomingBooking: Booking | null;
    totalEarningsToday: number;
    tripsToday: number;
    setOnline: (online: boolean) => void;
    setActiveBooking: (booking: Booking | null) => void;
    setIncomingBooking: (booking: Booking | null) => void;
    updateStats: (earnings: number, trips: number) => void;
    clearIncoming: () => void;
}
export declare const useDriverStore: import("zustand").UseBoundStore<import("zustand").StoreApi<DriverState>>;
export {};
//# sourceMappingURL=stores.d.ts.map