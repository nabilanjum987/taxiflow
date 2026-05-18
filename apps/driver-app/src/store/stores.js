"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDriverStore = exports.useAuthStore = void 0;
// src/store/authStore.ts
const zustand_1 = require("zustand");
const SecureStore = __importStar(require("expo-secure-store"));
exports.useAuthStore = (0, zustand_1.create)((set) => ({
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
                set({ user: JSON.parse(userStr), tenantId, isAuthenticated: true, isLoading: false });
            }
            else {
                set({ isLoading: false });
            }
        }
        catch {
            set({ isLoading: false });
        }
    },
}));
// src/store/driverStore.ts
const zustand_2 = require("zustand");
exports.useDriverStore = (0, zustand_2.create)((set) => ({
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
//# sourceMappingURL=stores.js.map