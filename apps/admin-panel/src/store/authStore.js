"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuthStore = void 0;
// src/store/authStore.ts
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
exports.useAuthStore = (0, zustand_1.create)()((0, middleware_1.persist)((set) => ({
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
}), { name: 'taxiflow-auth', partialize: (s) => ({ user: s.user, tenantId: s.tenantId, isAuthenticated: s.isAuthenticated }) }));
//# sourceMappingURL=authStore.js.map