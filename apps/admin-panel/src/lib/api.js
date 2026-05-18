"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
// src/lib/api.ts — Axios client with auto auth + tenant headers
const axios_1 = __importDefault(require("axios"));
const react_hot_toast_1 = __importDefault(require("react-hot-toast"));
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
exports.api = axios_1.default.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});
// Inject auth + tenant headers on every request
exports.api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    const tenantId = localStorage.getItem('tenantId');
    if (token)
        config.headers.Authorization = `Bearer ${token}`;
    if (tenantId)
        config.headers['x-tenant-id'] = tenantId;
    return config;
});
// Auto refresh on 401
let isRefreshing = false;
let failedQueue = [];
const processQueue = (error, token) => {
    failedQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
    failedQueue = [];
};
exports.api.interceptors.response.use((res) => res, async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then((token) => {
                original.headers.Authorization = `Bearer ${token}`;
                return (0, exports.api)(original);
            });
        }
        original._retry = true;
        isRefreshing = true;
        try {
            const { data } = await exports.api.post('/auth/refresh-token');
            const newToken = data.data.accessToken;
            localStorage.setItem('accessToken', newToken);
            processQueue(null, newToken);
            original.headers.Authorization = `Bearer ${newToken}`;
            return (0, exports.api)(original);
        }
        catch (err) {
            processQueue(err, null);
            localStorage.clear();
            window.location.href = '/login';
            return Promise.reject(err);
        }
        finally {
            isRefreshing = false;
        }
    }
    const message = error.response?.data?.error ?? 'Something went wrong';
    react_hot_toast_1.default.error(message);
    return Promise.reject(error);
});
exports.default = exports.api;
//# sourceMappingURL=api.js.map