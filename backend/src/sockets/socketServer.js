"use strict";
// ============================================================
// sockets/socketServer.ts
// Real-time engine — Socket.io
// Handles: booking broadcasts, GPS tracking, driver status
// agent.md real-time flow: passenger books → drivers notified
//   → driver accepts → GPS tracking starts → passenger sees map
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocketServer = initializeSocketServer;
exports.emitToTenant = emitToTenant;
exports.emitToBooking = emitToBooking;
exports.emitToDriver = emitToDriver;
exports.emitToDispatcher = emitToDispatcher;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
const logger_1 = require("../config/logger");
const shared_constants_1 = require("@taxiflow/shared-constants");
const logger = (0, logger_1.createModuleLogger)('socket-server');
function initializeSocketServer(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                // Allow configured frontend URLs
                const allowedOrigins = [
                    env_1.env.FRONTEND_URL,
                    'http://localhost:5173',
                    'http://localhost:3001',
                    'http://localhost:19000', // Expo dev
                ].filter(Boolean);
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                }
                else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
        },
        transports: ['websocket', 'polling'],
        pingInterval: 25000,
        pingTimeout: 60000,
    });
    // ─── AUTHENTICATION MIDDLEWARE ───────────────────────────
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token ||
                socket.handshake.headers.authorization?.replace('Bearer ', '');
            const tenantId = socket.handshake.headers[shared_constants_1.HEADERS.TENANT_ID];
            if (!token) {
                return next(new Error('Authentication token required'));
            }
            if (!tenantId) {
                return next(new Error('Tenant ID required'));
            }
            let decoded;
            try {
                decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
            }
            catch {
                return next(new Error('Invalid or expired token'));
            }
            const user = await database_1.prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, tenantId: true, role: true, status: true },
            });
            if (!user || user.status !== 'ACTIVE') {
                return next(new Error('User not found or inactive'));
            }
            if (user.role !== 'SUPER_ADMIN' && user.tenantId !== tenantId) {
                return next(new Error('Tenant mismatch'));
            }
            const authSocket = socket;
            authSocket.userId = user.id;
            authSocket.tenantId = tenantId;
            authSocket.role = user.role;
            next();
        }
        catch (error) {
            logger.error('Socket auth error', { error });
            next(new Error('Authentication failed'));
        }
    });
    // ─── CONNECTION HANDLER ──────────────────────────────────
    io.on('connection', (socket) => {
        const authSocket = socket;
        const { userId, tenantId, role } = authSocket;
        logger.info('Socket connected', { userId, tenantId, role, socketId: socket.id });
        // Auto-join tenant room
        void socket.join(shared_constants_1.SOCKET_ROOMS.tenant(tenantId));
        // Role-specific room joins
        if (role === 'DRIVER') {
            void socket.join(shared_constants_1.SOCKET_ROOMS.driver(userId));
            void handleDriverConnect(authSocket, io);
        }
        if (role === 'PASSENGER') {
            void socket.join(shared_constants_1.SOCKET_ROOMS.passenger(userId));
        }
        if (role === 'DISPATCHER' || role === 'TENANT_ADMIN') {
            void socket.join(shared_constants_1.SOCKET_ROOMS.dispatcher(tenantId));
        }
        // ─── DRIVER GPS LOCATION UPDATE ─────────────────────────
        socket.on(shared_constants_1.SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, async (data) => {
            if (role !== 'DRIVER')
                return;
            try {
                // Validate data
                if (typeof data.latitude !== 'number' ||
                    typeof data.longitude !== 'number' ||
                    Math.abs(data.latitude) > 90 ||
                    Math.abs(data.longitude) > 180) {
                    return;
                }
                // Cache driver location in Redis (fast reads)
                await (0, redis_1.cacheSet)(shared_constants_1.CACHE_KEYS.driverLocation(userId), { latitude: data.latitude, longitude: data.longitude, heading: data.heading, updatedAt: new Date() }, shared_constants_1.CACHE_TTL.DRIVER_LOCATION);
                // Update DB (async — don't await to keep socket fast)
                void database_1.prisma.driver.update({
                    where: { userId },
                    data: {
                        currentLatitude: data.latitude,
                        currentLongitude: data.longitude,
                        currentHeading: data.heading,
                        lastLocationAt: new Date(),
                    },
                });
                // Broadcast to dispatcher room
                socket.to(shared_constants_1.SOCKET_ROOMS.dispatcher(tenantId)).emit(shared_constants_1.SOCKET_EVENTS.DRIVER_LOCATION, {
                    driverId: userId,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    heading: data.heading,
                });
                // If driver is on a trip, broadcast to passenger
                const driver = await database_1.prisma.driver.findUnique({
                    where: { userId },
                    select: { id: true, onlineStatus: true },
                });
                if (driver?.onlineStatus === 'ON_TRIP') {
                    const activeBooking = await database_1.prisma.booking.findFirst({
                        where: {
                            driverId: driver.id,
                            status: { in: ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] },
                        },
                        select: { id: true, passengerId: true },
                    });
                    if (activeBooking) {
                        // Save tracking point
                        void database_1.prisma.bookingTracking.create({
                            data: {
                                bookingId: activeBooking.id,
                                latitude: data.latitude,
                                longitude: data.longitude,
                                heading: data.heading,
                                speed: data.speed,
                            },
                        });
                        // Notify passenger
                        io.to(shared_constants_1.SOCKET_ROOMS.booking(activeBooking.id)).emit(shared_constants_1.SOCKET_EVENTS.DRIVER_LOCATION, {
                            driverId: userId,
                            latitude: data.latitude,
                            longitude: data.longitude,
                            heading: data.heading,
                        });
                    }
                }
            }
            catch (error) {
                logger.error('Error handling driver location update', { error, userId });
            }
        });
        // ─── JOIN BOOKING ROOM ────────────────────────────────
        socket.on(shared_constants_1.SOCKET_EVENTS.JOIN_BOOKING_ROOM, async ({ bookingId }) => {
            try {
                // Verify user has access to this booking
                const booking = await database_1.prisma.booking.findFirst({
                    where: {
                        id: bookingId,
                        tenantId,
                        OR: [
                            { passenger: { userId } },
                            { driver: { userId } },
                        ],
                    },
                });
                if (!booking)
                    return;
                await socket.join(shared_constants_1.SOCKET_ROOMS.booking(bookingId));
                logger.debug('User joined booking room', { userId, bookingId });
            }
            catch (error) {
                logger.error('Error joining booking room', { error, userId, bookingId });
            }
        });
        // ─── LEAVE BOOKING ROOM ───────────────────────────────
        socket.on(shared_constants_1.SOCKET_EVENTS.LEAVE_BOOKING_ROOM, ({ bookingId }) => {
            void socket.leave(shared_constants_1.SOCKET_ROOMS.booking(bookingId));
        });
        // ─── DISCONNECT ───────────────────────────────────────
        socket.on('disconnect', () => {
            logger.info('Socket disconnected', { userId, socketId: socket.id });
            if (role === 'DRIVER') {
                void handleDriverDisconnect(userId);
            }
        });
    });
    logger.info('✅ Socket.io server initialized');
    return io;
}
// ─── DRIVER CONNECT / DISCONNECT HELPERS ──────────────────
async function handleDriverConnect(socket, io) {
    try {
        const driver = await database_1.prisma.driver.findUnique({
            where: { userId: socket.userId },
            select: { id: true, status: true },
        });
        if (!driver || driver.status !== 'APPROVED')
            return;
        // Mark as online
        await database_1.prisma.driver.update({
            where: { userId: socket.userId },
            data: { onlineStatus: 'ONLINE' },
        });
        // Broadcast to dispatchers
        io.to(shared_constants_1.SOCKET_ROOMS.dispatcher(socket.tenantId)).emit(shared_constants_1.SOCKET_EVENTS.DRIVER_STATUS_CHANGED, {
            driverId: socket.userId,
            status: 'ONLINE',
        });
    }
    catch (error) {
        logger.error('handleDriverConnect error', { error });
    }
}
async function handleDriverDisconnect(userId) {
    try {
        const driver = await database_1.prisma.driver.findUnique({
            where: { userId },
            select: { id: true, onlineStatus: true, tenantId: true },
        });
        if (!driver || driver.onlineStatus === 'ON_TRIP')
            return;
        await database_1.prisma.driver.update({
            where: { userId },
            data: { onlineStatus: 'OFFLINE' },
        });
        // Clean up location cache
        await (0, redis_1.cacheDel)(shared_constants_1.CACHE_KEYS.driverLocation(userId));
    }
    catch (error) {
        logger.error('handleDriverDisconnect error', { error });
    }
}
// ─── EMIT HELPERS (used by other modules) ─────────────────
// These are imported by booking.service.ts etc. to emit events
function emitToTenant(io, tenantId, event, data) {
    io.to(shared_constants_1.SOCKET_ROOMS.tenant(tenantId)).emit(event, data);
}
function emitToBooking(io, bookingId, event, data) {
    io.to(shared_constants_1.SOCKET_ROOMS.booking(bookingId)).emit(event, data);
}
function emitToDriver(io, driverId, event, data) {
    io.to(shared_constants_1.SOCKET_ROOMS.driver(driverId)).emit(event, data);
}
function emitToDispatcher(io, tenantId, event, data) {
    io.to(shared_constants_1.SOCKET_ROOMS.dispatcher(tenantId)).emit(event, data);
}
//# sourceMappingURL=socketServer.js.map