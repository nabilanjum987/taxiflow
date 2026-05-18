import type { AuthUser } from '@taxiflow/shared-types';
interface AuthState {
    user: AuthUser | null;
    accessToken: string | null;
    tenantId: string | null;
    isAuthenticated: boolean;
    setAuth: (user: AuthUser, token: string, tenantId: string) => void;
    clearAuth: () => void;
}
export declare const useAuthStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<AuthState>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<AuthState, {
            user: AuthUser | null;
            tenantId: string | null;
            isAuthenticated: boolean;
        }>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: AuthState) => void) => () => void;
        onFinishHydration: (fn: (state: AuthState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<AuthState, {
            user: AuthUser | null;
            tenantId: string | null;
            isAuthenticated: boolean;
        }>>;
    };
}>;
export {};
//# sourceMappingURL=authStore.d.ts.map