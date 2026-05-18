// ============================================================
// sockets/socketServer.ts
// Real-time engine — Socket.io
// Handles: booking broadcasts, GPS tracking, driver status
// agent.md real-time flow: passenger books → drivers notified
//   → driver accepts → GPS tracking starts → passenger sees map
// ============================================================

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { cacheSet, cacheGet, cacheDel } from '../config/redis';
import { createModuleLogger } from '../config/logger';
import { SOCKET_EVENTS, SOCKET_ROOMS, CACHE_KEYS, CACHE_TTL, HEADERS } from '@taxiflow/shared-constants';
import type { UserRole } from '@taxiflow/shared-types';
import type { JwtPayload } from '../middleware/authMiddleware';

const logger = createModuleLogger('socket-server');

interface AuthenticatedSocket extends Socket {
  userId: string;
  tenantId: string;
  role: UserRole;
}

export function initializeSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow configured frontend URLs
        const allowedOrigins = [
          env.FRONTEND_URL,
          'http://localhost:5173',
          'http://localhost:3001',
          'http://localhost:19000', // Expo dev
        ].filter(Boolean);
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
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
      const token =
        (socket.handshake.auth as { token?: string }).token ||
        (socket.handshake.headers.authorization as string | undefined)?.replace('Bearer ', '');

      const tenantId = socket.handshake.headers[HEADERS.TENANT_ID] as string | undefined;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      if (!tenantId) {
        return next(new Error('Tenant ID required'));
      }

      let decoded: JwtPayload;
      try {
        decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      } catch {
        return next(new Error('Invalid or expired token'));
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, tenantId: true, role: true, status: true },
      });

      if (!user || user.status !== 'ACTIVE') {
        return next(new Error('User not found or inactive'));
      }

      if (user.role !== 'SUPER_ADMIN' && user.tenantId !== tenantId) {
        return next(new Error('Tenant mismatch'));
      }

      const authSocket = socket as AuthenticatedSocket;
      authSocket.userId = user.id;
      authSocket.tenantId = tenantId;
      authSocket.role = user.role as UserRole;

      next();
    } catch (error) {
      logger.error('Socket auth error', { error });
      next(new Error('Authentication failed'));
    }
  });

  // ─── CONNECTION HANDLER ──────────────────────────────────

  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const { userId, tenantId, role } = authSocket;

    logger.info('Socket connected', { userId, tenantId, role, socketId: socket.id });

    // Auto-join tenant room
    void socket.join(SOCKET_ROOMS.tenant(tenantId));

    // Role-specific room joins
    if (role === 'DRIVER') {
      void socket.join(SOCKET_ROOMS.driver(userId));
      void handleDriverConnect(authSocket, io);
    }

    if (role === 'PASSENGER') {
      void socket.join(SOCKET_ROOMS.passenger(userId));
    }

    if (role === 'DISPATCHER' || role === 'TENANT_ADMIN') {
      void socket.join(SOCKET_ROOMS.dispatcher(tenantId));
    }

    // ─── DRIVER GPS LOCATION UPDATE ─────────────────────────

    socket.on(SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, async (data: {
      latitude: number;
      longitude: number;
      heading: number;
      speed: number;
    }) => {
      if (role !== 'DRIVER') return;

      try {
        // Validate data
        if (
          typeof data.latitude !== 'number' ||
          typeof data.longitude !== 'number' ||
          Math.abs(data.latitude) > 90 ||
          Math.abs(data.longitude) > 180
        ) {
          return;
        }

        // Cache driver location in Redis (fast reads)
        await cacheSet(
          CACHE_KEYS.driverLocation(userId),
          { latitude: data.latitude, longitude: data.longitude, heading: data.heading, updatedAt: new Date() },
          CACHE_TTL.DRIVER_LOCATION,
        );

        // Update DB (async — don't await to keep socket fast)
        void prisma.driver.update({
          where: { userId },
          data: {
            currentLatitude: data.latitude,
            currentLongitude: data.longitude,
            currentHeading: data.heading,
            lastLocationAt: new Date(),
          },
        });

        // Broadcast to dispatcher room
        socket.to(SOCKET_ROOMS.dispatcher(tenantId)).emit(SOCKET_EVENTS.DRIVER_LOCATION, {
          driverId: userId,
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
        });

        // If driver is on a trip, broadcast to passenger
        const driver = await prisma.driver.findUnique({
          where: { userId },
          select: { id: true, onlineStatus: true },
        });

        if (driver?.onlineStatus === 'ON_TRIP') {
          const activeBooking = await prisma.booking.findFirst({
            where: {
              driverId: driver.id,
              status: { in: ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] },
            },
            select: { id: true, passengerId: true },
          });

          if (activeBooking) {
            // Save tracking point
            void prisma.bookingTracking.create({
              data: {
                bookingId: activeBooking.id,
                latitude: data.latitude,
                longitude: data.longitude,
                heading: data.heading,
                speed: data.speed,
              },
            });

            // Notify passenger
            io.to(SOCKET_ROOMS.booking(activeBooking.id)).emit(SOCKET_EVENTS.DRIVER_LOCATION, {
              driverId: userId,
              latitude: data.latitude,
              longitude: data.longitude,
              heading: data.heading,
            });
          }
        }
      } catch (error) {
        logger.error('Error handling driver location update', { error, userId });
      }
    });

    // ─── JOIN BOOKING ROOM ────────────────────────────────

    socket.on(SOCKET_EVENTS.JOIN_BOOKING_ROOM, async ({ bookingId }: { bookingId: string }) => {
      try {
        // Verify user has access to this booking
        const booking = await prisma.booking.findFirst({
          where: {
            id: bookingId,
            tenantId,
            OR: [
              { passenger: { userId } },
              { driver: { userId } },
            ],
          },
        });

        if (!booking) return;

        await socket.join(SOCKET_ROOMS.booking(bookingId));
        logger.debug('User joined booking room', { userId, bookingId });
      } catch (error) {
        logger.error('Error joining booking room', { error, userId, bookingId });
      }
    });

    // ─── LEAVE BOOKING ROOM ───────────────────────────────

    socket.on(SOCKET_EVENTS.LEAVE_BOOKING_ROOM, ({ bookingId }: { bookingId: string }) => {
      void socket.leave(SOCKET_ROOMS.booking(bookingId));
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

async function handleDriverConnect(
  socket: AuthenticatedSocket,
  io: SocketIOServer,
): Promise<void> {
  try {
    const driver = await prisma.driver.findUnique({
      where: { userId: socket.userId },
      select: { id: true, status: true },
    });

    if (!driver || driver.status !== 'APPROVED') return;

    // Mark as online
    await prisma.driver.update({
      where: { userId: socket.userId },
      data: { onlineStatus: 'ONLINE' },
    });

    // Broadcast to dispatchers
    io.to(SOCKET_ROOMS.dispatcher(socket.tenantId)).emit(SOCKET_EVENTS.DRIVER_STATUS_CHANGED, {
      driverId: socket.userId,
      status: 'ONLINE',
    });
  } catch (error) {
    logger.error('handleDriverConnect error', { error });
  }
}

async function handleDriverDisconnect(userId: string): Promise<void> {
  try {
    const driver = await prisma.driver.findUnique({
      where: { userId },
      select: { id: true, onlineStatus: true, tenantId: true },
    });

    if (!driver || driver.onlineStatus === 'ON_TRIP') return;

    await prisma.driver.update({
      where: { userId },
      data: { onlineStatus: 'OFFLINE' },
    });

    // Clean up location cache
    await cacheDel(CACHE_KEYS.driverLocation(userId));
  } catch (error) {
    logger.error('handleDriverDisconnect error', { error });
  }
}

// ─── EMIT HELPERS (used by other modules) ─────────────────

// These are imported by booking.service.ts etc. to emit events
export function emitToTenant(
  io: SocketIOServer,
  tenantId: string,
  event: string,
  data: unknown,
): void {
  io.to(SOCKET_ROOMS.tenant(tenantId)).emit(event, data);
}

export function emitToBooking(
  io: SocketIOServer,
  bookingId: string,
  event: string,
  data: unknown,
): void {
  io.to(SOCKET_ROOMS.booking(bookingId)).emit(event, data);
}

export function emitToDriver(
  io: SocketIOServer,
  driverId: string,
  event: string,
  data: unknown,
): void {
  io.to(SOCKET_ROOMS.driver(driverId)).emit(event, data);
}

export function emitToDispatcher(
  io: SocketIOServer,
  tenantId: string,
  event: string,
  data: unknown,
): void {
  io.to(SOCKET_ROOMS.dispatcher(tenantId)).emit(event, data);
}
