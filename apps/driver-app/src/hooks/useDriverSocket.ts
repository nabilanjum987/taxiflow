// src/hooks/useDriverSocket.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import { SOCKET_EVENTS } from '@taxiflow/shared-constants';
import { useDriverStore } from '../store/stores';
import type { Booking } from '@taxiflow/shared-types';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3000';
const GPS_INTERVAL_MS = 5000;

export function useDriverSocket(): void {
  const socketRef = useRef<Socket | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isOnline, setIncomingBooking, setActiveBooking, activeBooking } = useDriverStore();

  useEffect(() => {
    let socket: Socket;

    const connect = async (): Promise<void> => {
      const token = await SecureStore.getItemAsync('driver_accessToken');
      const tenantId = await SecureStore.getItemAsync('driver_tenantId');
      if (!token || !tenantId) return;

      socket = io(SOCKET_URL, {
        auth: { token },
        extraHeaders: { 'x-tenant-id': tenantId },
        reconnection: true,
        reconnectionDelay: 2000,
      });

      socket.on('connect', () => console.log('Driver socket connected'));
      socket.on('disconnect', () => console.log('Driver socket disconnected'));

      // New booking request coming in
      socket.on(SOCKET_EVENTS.BOOKING_NEW, (data: { booking: Booking; distanceKm: string }) => {
        setIncomingBooking(data.booking);
      });

      // Booking updated (e.g. cancelled while driver is going to pickup)
      socket.on(SOCKET_EVENTS.BOOKING_CANCELLED, () => {
        setActiveBooking(null);
        setIncomingBooking(null);
      });

      socketRef.current = socket;
    };

    void connect();
    return () => { socket?.disconnect(); };
  }, []);

  // Start/stop GPS broadcasting based on online status
  useEffect(() => {
    if (isOnline && socketRef.current) {
      locationIntervalRef.current = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
          });
          socketRef.current?.emit(SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            heading: loc.coords.heading ?? 0,
            speed: loc.coords.speed ?? 0,
          });
        } catch {
          // GPS error — continue silently
        }
      }, GPS_INTERVAL_MS);
    } else {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    }

    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, [isOnline]);
}
