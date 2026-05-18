import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
export declare function initializeSocketServer(httpServer: HttpServer): SocketIOServer;
export declare function emitToTenant(io: SocketIOServer, tenantId: string, event: string, data: unknown): void;
export declare function emitToBooking(io: SocketIOServer, bookingId: string, event: string, data: unknown): void;
export declare function emitToDriver(io: SocketIOServer, driverId: string, event: string, data: unknown): void;
export declare function emitToDispatcher(io: SocketIOServer, tenantId: string, event: string, data: unknown): void;
//# sourceMappingURL=socketServer.d.ts.map