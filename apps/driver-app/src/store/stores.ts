// src/store/authStore.ts
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenantId: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (user, token, tenantId) => {
    await SecureStore.setItemAsync('driver_accessToken', token);
    await SecureStore.setItemAsync('driver_tenantId', tenantId);
    await SecureStore.setItemAsync('driver_user', JSON.stringify(user));
    set({ user, tenantId, isAuthenticated: true, isLoading: false });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('driver_accessToken');
    await SecureStore.deleteItemAsync('driver_tenantId');
    await SecureStore.deleteItemAsync('driver_user');
    set({ user: null, tenantId: null, isAuthenticated: false, isLoading: false });
  },

  loadFromStorage: async () => {
    try {
      const [token, tenantId, userStr] = await Promise.all([
        SecureStore.getItemAsync('driver_accessToken'),
        SecureStore.getItemAsync('driver_tenantId'),
        SecureStore.getItemAsync('driver_user'),
      ]);
      if (token && tenantId && userStr) {
        set({ user: JSON.parse(userStr) as AuthUser, tenantId, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));

// src/store/driverStore.ts
import { create as createStore } from 'zustand';
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

export const useDriverStore = createStore<DriverState>((set) => ({
  isOnline: false,
  activeBooking: null,
  incomingBooking: null,
  totalEarningsToday: 0,
  tripsToday: 0,

  setOnline: (isOnline) => set({ isOnline }),
  setActiveBooking: (activeBooking) => set({ activeBooking }),
  setIncomingBooking: (incomingBooking) => set({ incomingBooking }),
  updateStats: (totalEarningsToday, tripsToday) => set({ totalEarningsToday, tripsToday }),
  clearIncoming: () => set({ incomingBooking: null }),
}));
