// App.tsx — Driver App Root
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { Platform, Alert } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

// Show notifications when app is in foreground — critical for incoming bookings
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

async function setupPermissions(): Promise<void> {
  if (!Device.isDevice) return;

  // Push notifications
  const { status: notifStatus } = await Notifications.getPermissionsAsync();
  if (notifStatus !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bookings', {
      name: 'New Booking Requests',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#f59e0b',
      sound: 'notification.wav',
    });
  }

  // Foreground location — required for GPS broadcasting
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    Alert.alert(
      'Location Required',
      'CityRide Driver needs location access to broadcast your position to passengers.',
    );
    return;
  }

  // Background location — required for GPS during trips when app is backgrounded
  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') {
    Alert.alert(
      'Background Location',
      'For the best experience, please allow "Always" location access so passengers can track you during trips.',
    );
  }
}

export default function App(): React.JSX.Element {
  useEffect(() => {
    void setupPermissions();

    // Handle notification taps
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { bookingId?: string; type?: string };
      if (data?.type === 'BOOKING_NEW' && data.bookingId) {
        // Socket handles the incoming booking display — just log for now
        console.log('Notification tapped — incoming booking:', data.bookingId);
      }
    });

    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <AppNavigator />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
