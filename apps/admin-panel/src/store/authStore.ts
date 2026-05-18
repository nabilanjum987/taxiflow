// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@taxiflow/shared-types';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, token: string, tenantId: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      tenantId: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, tenantId) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('tenantId', tenantId);
        set({ user, accessToken, tenantId, isAuthenticated: true });
      },
      clearAuth: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('tenantId');
        set({ user: null, accessToken: null, tenantId: null, isAuthenticated: false });
      },
    }),
    { name: 'taxiflow-auth', partialize: (s) => ({ user: s.user, tenantId: s.tenantId, isAuthenticated: s.isAuthenticated }) },
  ),
);
