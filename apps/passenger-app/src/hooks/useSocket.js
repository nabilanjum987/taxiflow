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
exports.useSocket = useSocket;
// src/hooks/useSocket.ts
const react_1 = require("react");
const socket_io_client_1 = require("socket.io-client");
const SecureStore = __importStar(require("expo-secure-store"));
const shared_constants_1 = require("@taxiflow/shared-constants");
const bookingStore_1 = require("../store/bookingStore");
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3000';
function useSocket() {
    const socketRef = (0, react_1.useRef)(null);
    const { updateBookingStatus, setDriverLocation, setActiveBooking } = (0, bookingStore_1.useBookingStore)();
    (0, react_1.useEffect)(() => {
        let socket;
        const connect = async () => {
            const token = await SecureStore.getItemAsync('accessToken');
            const tenantId = await SecureStore.getItemAsync('tenantId');
            if (!token || !tenantId)
                return;
            socket = (0, socket_io_client_1.io)(SOCKET_URL, {
                auth: { token },
                extraHeaders: { 'x-tenant-id': tenantId },
                reconnection: true,
                reconnectionDelay: 2000,
                reconnectionAttempts: 10,
            });
            socket.on('connect', () => {
                console.log('Socket connected');
            });
            socket.on(shared_constants_1.SOCKET_EVENTS.BOOKING_ACCEPTED, (data) => {
                setActiveBooking(data.booking);
            });
            socket.on(shared_constants_1.SOCKET_EVENTS.BOOKING_UPDATED, (data) => {
                setActiveBooking(data.booking);
            });
            socket.on(shared_constants_1.SOCKET_EVENTS.DRIVER_LOCATION, (data) => {
                setDriverLocation(data);
            });
            socket.on(shared_constants_1.SOCKET_EVENTS.BOOKING_CANCELLED, (data) => {
                updateBookingStatus(data.bookingId, 'CANCELLED');
            });
            socket.on(shared_constants_1.SOCKET_EVENTS.RIDE_COMPLETED, (data) => {
                updateBookingStatus(data.bookingId, 'COMPLETED');
            });
            socketRef.current = socket;
        };
        void connect();
        return () => {
            socket?.disconnect();
        };
    }, []);
}
//# sourceMappingURL=useSocket.js.map