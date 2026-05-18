// src/hooks/useSocket.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { SOCKET_EVENTS } from '@taxiflow/shared-constants';
import { useBookingStore } from '../store/bookingStore';
import type { Booking } from '@taxiflow/shared-types';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3000';

export function useSocket(): void {
  const socketRef = useRef<Socket | null>(null);
  const { updateBookingStatus, setDriverLocation, setActiveBooking } = useBookingStore();

  useEffect(() => {
    let socket: Socket;

    const connect = async (): Promise<void> => {
      const token = await SecureStore.getItemAsync('accessToken');
      const tenantId = await SecureStore.getItemAsync('tenantId');
      if (!token || !tenantId) return;

      socket = io(SOCKET_URL, {
        auth: { token },
        extraHeaders: { 'x-tenant-id': tenantId },
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 10,
      });

      socket.on('connect', () => {
        console.log('Socket connected');
      });

      socket.on(SOCKET_EVENTS.BOOKING_ACCEPTED, (data: { booking: Booking }) => {
        setActiveBooking(data.booking);
      });

      socket.on(SOCKET_EVENTS.BOOKING_UPDATED, (data: { booking: Booking }) => {
        setActiveBooking(data.booking);
      });

      socket.on(SOCKET_EVENTS.DRIVER_LOCATION, (data: {
        latitude: number; longitude: number; heading: number;
      }) => {
        setDriverLocation(data);
      });

      socket.on(SOCKET_EVENTS.BOOKING_CANCELLED, (data: { bookingId: string }) => {
        updateBookingStatus(data.bookingId, 'CANCELLED');
      });

      socket.on(SOCKET_EVENTS.RIDE_COMPLETED, (data: { bookingId: string }) => {
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
