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
exports.useDriverSocket = useDriverSocket;
// src/hooks/useDriverSocket.ts
const react_1 = require("react");
const socket_io_client_1 = require("socket.io-client");
const SecureStore = __importStar(require("expo-secure-store"));
const Location = __importStar(require("expo-location"));
const shared_constants_1 = require("@taxiflow/shared-constants");
const stores_1 = require("../store/stores");
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3000';
const GPS_INTERVAL_MS = 5000;
function useDriverSocket() {
    const socketRef = (0, react_1.useRef)(null);
    const locationIntervalRef = (0, react_1.useRef)(null);
    const { isOnline, setIncomingBooking, setActiveBooking, activeBooking } = (0, stores_1.useDriverStore)();
    (0, react_1.useEffect)(() => {
        let socket;
        const connect = async () => {
            const token = await SecureStore.getItemAsync('driver_accessToken');
            const tenantId = await SecureStore.getItemAsync('driver_tenantId');
            if (!token || !tenantId)
                return;
            socket = (0, socket_io_client_1.io)(SOCKET_URL, {
                auth: { token },
                extraHeaders: { 'x-tenant-id': tenantId },
                reconnection: true,
                reconnectionDelay: 2000,
            });
            socket.on('connect', () => console.log('Driver socket connected'));
            socket.on('disconnect', () => console.log('Driver socket disconnected'));
            // New booking request coming in
            socket.on(shared_constants_1.SOCKET_EVENTS.BOOKING_NEW, (data) => {
                setIncomingBooking(data.booking);
            });
            // Booking updated (e.g. cancelled while driver is going to pickup)
            socket.on(shared_constants_1.SOCKET_EVENTS.BOOKING_CANCELLED, () => {
                setActiveBooking(null);
                setIncomingBooking(null);
            });
            socketRef.current = socket;
        };
        void connect();
        return () => { socket?.disconnect(); };
    }, []);
    // Start/stop GPS broadcasting based on online status
    (0, react_1.useEffect)(() => {
        if (isOnline && socketRef.current) {
            locationIntervalRef.current = setInterval(async () => {
                try {
                    const loc = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.BestForNavigation,
                    });
                    socketRef.current?.emit(shared_constants_1.SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, {
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                        heading: loc.coords.heading ?? 0,
                        speed: loc.coords.speed ?? 0,
                    });
                }
                catch {
                    // GPS error — continue silently
                }
            }, GPS_INTERVAL_MS);
        }
        else {
            if (locationIntervalRef.current) {
                clearInterval(locationIntervalRef.current);
                locationIntervalRef.current = null;
            }
        }
        return () => {
            if (locationIntervalRef.current)
                clearInterval(locationIntervalRef.current);
        };
    }, [isOnline]);
}
//# sourceMappingURL=useDriverSocket.js.map