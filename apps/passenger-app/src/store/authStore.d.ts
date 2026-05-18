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
export {};
//# sourceMappingURL=authStore.d.ts.map