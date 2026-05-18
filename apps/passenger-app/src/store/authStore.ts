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
    await SecureStore.setItemAsync('accessToken', token);
    await SecureStore.setItemAsync('tenantId', tenantId);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    set({ user, tenantId, isAuthenticated: true, isLoading: false });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('tenantId');
    await SecureStore.deleteItemAsync('user');
    set({ user: null, tenantId: null, isAuthenticated: false, isLoading: false });
  },

  loadFromStorage: async () => {
    try {
      const [token, tenantId, userStr] = await Promise.all([
        SecureStore.getItemAsync('accessToken'),
        SecureStore.getItemAsync('tenantId'),
        SecureStore.getItemAsync('user'),
      ]);
      if (token && tenantId && userStr) {
        const user = JSON.parse(userStr) as AuthUser;
        set({ user, tenantId, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
