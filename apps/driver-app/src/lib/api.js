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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
// src/lib/api.ts — Driver app API client
const axios_1 = __importDefault(require("axios"));
const SecureStore = __importStar(require("expo-secure-store"));
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
exports.api = axios_1.default.create({
    baseURL: API_BASE,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});
exports.api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('driver_accessToken');
    const tenantId = await SecureStore.getItemAsync('driver_tenantId');
    if (token)
        config.headers.Authorization = `Bearer ${token}`;
    if (tenantId)
        config.headers['x-tenant-id'] = tenantId;
    return config;
});
let isRefreshing = false;
let failedQueue = [];
exports.api.interceptors.response.use((res) => res, async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then((token) => {
                original.headers.Authorization = `Bearer ${String(token)}`;
                return (0, exports.api)(original);
            });
        }
        original._retry = true;
        isRefreshing = true;
        try {
            const { data } = await exports.api.post('/auth/refresh-token');
            const newToken = String(data.data.accessToken);
            await SecureStore.setItemAsync('driver_accessToken', newToken);
            failedQueue.forEach(p => p.resolve(newToken));
            failedQueue = [];
            original.headers.Authorization = `Bearer ${newToken}`;
            return (0, exports.api)(original);
        }
        catch (err) {
            failedQueue.forEach(p => p.reject(err));
            failedQueue = [];
            await SecureStore.deleteItemAsync('driver_accessToken');
            return Promise.reject(err);
        }
        finally {
            isRefreshing = false;
        }
    }
    return Promise.reject(error);
});
exports.default = exports.api;
//# sourceMappingURL=api.js.map