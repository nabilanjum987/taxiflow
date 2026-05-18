// src/screens/home/DriverHomeScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Vibration, ScrollView, Modal,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore, useDriverStore } from '../store/stores';
import { useDriverSocket } from '../hooks/useDriverSocket';
import api from '../lib/api';
import { Colors, Spacing, Radius, Shadow } from '../constants/theme';

// Theme copy — same tokens as passenger app
const C = Colors;

export default function DriverHomeScreen(): React.JSX.Element {
  const { user } = useAuthStore();
  const { isOnline, setOnline, activeBooking, setActiveBooking, incomingBooking, clearIncoming } = useDriverStore();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [acceptTimeout, setAcceptTimeout] = useState<number>(30);

  // Connect socket + start GPS
  useDriverSocket();

  // Countdown timer for incoming booking
  useEffect(() => {
    if (!incomingBooking) return;
    setAcceptTimeout(30);
    Vibration.vibrate([0, 300, 200, 300, 200, 300]);

    const timer = setInterval(() => {
      setAcceptTimeout(t => {
        if (t <= 1) { clearIncoming(); clearInterval(timer); return 0; }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingBooking?.id]);

  useEffect(() => { void requestLocation(); }, []);

  const requestLocation = async (): Promise<void> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
  };

  const toggleOnlineMutation = useMutation({
    mutationFn: (online: boolean) => api.patch('/drivers/me/status', { online }),
    onSuccess: (_, online) => {
      setOnline(online);
    },
    onError: () => Alert.alert('Error', 'Could not update status. Check your connection.'),
  });

  const acceptMutation = useMutation({
    mutationFn: (bookingId: string) => api.post(`/bookings/${bookingId}/accept`),
    onSuccess: (res) => {
      setActiveBooking(res.data.data);
      clearIncoming();
    },
    onError: () => {
      Alert.alert('Booking Taken', 'Another driver accepted this ride first.');
      clearIncoming();
    },
  });

  const arrivedMutation = useMutation({
    mutationFn: (bookingId: string) => api.post(`/bookings/${bookingId}/arrived`),
    onSuccess: (res) => setActiveBooking(res.data.data),
  });

  const startRideMutation = useMutation({
    mutationFn: (bookingId: string) => api.post(`/bookings/${bookingId}/start`),
    onSuccess: (res) => setActiveBooking(res.data.data),
  });

  const completeRideMutation = useMutation({
    mutationFn: (bookingId: string) => api.post(`/bookings/${bookingId}/complete`),
    onSuccess: () => {
      setActiveBooking(null);
      Alert.alert('Ride Complete! 🎉', 'Your earnings have been updated.');
    },
  });

  const { data: earningsData } = useQuery({
    queryKey: ['driver-earnings-today'],
    queryFn: async () => {
      const driverRes = await api.get('/drivers/me');
      const driver = driverRes.data.data as { id: string };
      return api.get(`/drivers/me/earnings?days=1`).then(r => r.data.data);
    },
    refetchInterval: 60_000,
  });

  const handleToggleOnline = (): void => {
    if (!isOnline) {
      Alert.alert('Go Online', 'You will start receiving booking requests.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go Online', onPress: () => toggleOnlineMutation.mutate(true) },
      ]);
    } else {
      if (activeBooking) {
        Alert.alert('Active Trip', 'Complete your current trip before going offline.');
        return;
      }
      toggleOnlineMutation.mutate(false);
    }
  };

  const bookingStatusAction = (): void => {
    if (!activeBooking) return;
    const { id, status } = activeBooking;
    if (status === 'ACCEPTED') arrivedMutation.mutate(id);
    else if (status === 'DRIVER_ARRIVED') startRideMutation.mutate(id);
    else if (status === 'IN_PROGRESS') {
      Alert.alert('Complete Ride', 'Confirm the passenger has been dropped off?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: () => completeRideMutation.mutate(id) },
      ]);
    }
  };

  const actionLabel = (): string => {
    if (!activeBooking) return '';
    const map: Record<string, string> = {
      ACCEPTED: "I've Arrived at Pickup",
      DRIVER_ARRIVED: 'Start Ride',
      IN_PROGRESS: 'Complete Ride',
    };
    return map[activeBooking.status] ?? '';
  };

  const isLoading = arrivedMutation.isPending || startRideMutation.isPending || completeRideMutation.isPending;

  return (
    <View style={s.container}>
      {/* Map */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={s.map}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={userLocation
          ? { ...userLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 }
          : { latitude: 51.5074, longitude: -0.1278, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        }
      />

      {/* Status + greeting bar */}
      <SafeAreaView style={s.topBar} edges={['top']}>
        <View style={s.topBarInner}>
          <View>
            <Text style={s.greetingName}>Hi, {user?.firstName} 👋</Text>
            <Text style={s.greetingSub}>{isOnline ? '🟢 Online — accepting rides' : '⚪ Offline'}</Text>
          </View>
          <TouchableOpacity
            style={[s.onlineBtn, isOnline ? s.onlineBtnActive : s.onlineBtnInactive]}
            onPress={handleToggleOnline}
            disabled={toggleOnlineMutation.isPending}
          >
            {toggleOnlineMutation.isPending
              ? <ActivityIndicator size="small" color={C.white} />
              : <Text style={s.onlineBtnText}>{isOnline ? 'Go Offline' : 'Go Online'}</Text>
            }
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Earnings strip */}
      {earningsData && (
        <View style={s.earningsStrip}>
          <View style={s.earningItem}>
            <Text style={s.earningValue}>£{earningsData.totalEarnings?.toFixed(2) ?? '0.00'}</Text>
            <Text style={s.earningLabel}>Today</Text>
          </View>
          <View style={s.earningDivider} />
          <View style={s.earningItem}>
            <Text style={s.earningValue}>{earningsData.totalTrips ?? 0}</Text>
            <Text style={s.earningLabel}>Trips</Text>
          </View>
          <View style={s.earningDivider} />
          <View style={s.earningItem}>
            <Text style={s.earningValue}>★ {earningsData.rating?.toFixed(1) ?? '—'}</Text>
            <Text style={s.earningLabel}>Rating</Text>
          </View>
        </View>
      )}

      {/* Active Trip Panel */}
      {activeBooking && (
        <View style={s.activePanel}>
          <View style={s.sheetHandle} />

          {/* Status */}
          <View style={[s.statusRow, { backgroundColor: activeBooking.status === 'IN_PROGRESS' ? C.brand + '15' : C.info + '15' }]}>
            <Ionicons
              name={activeBooking.status === 'IN_PROGRESS' ? 'navigate' : 'car'}
              size={18}
              color={activeBooking.status === 'IN_PROGRESS' ? C.brand : C.info}
            />
            <Text style={[s.statusText, { color: activeBooking.status === 'IN_PROGRESS' ? C.brand : C.info }]}>
              {activeBooking.status === 'ACCEPTED' && 'Head to pickup location'}
              {activeBooking.status === 'DRIVER_ARRIVED' && 'Waiting for passenger'}
              {activeBooking.status === 'IN_PROGRESS' && 'Trip in progress — navigate to destination'}
            </Text>
          </View>

          {/* Passenger info */}
          <View style={s.passengerCard}>
            <View style={s.passengerAvatar}>
              <Text style={s.passengerInitials}>
                {activeBooking.passenger?.user?.firstName?.[0]}{activeBooking.passenger?.user?.lastName?.[0]}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.passengerName}>
                {activeBooking.passenger?.user?.firstName} {activeBooking.passenger?.user?.lastName}
              </Text>
              <Text style={s.passengerPhone}>{activeBooking.passenger?.user?.phone}</Text>
            </View>
            <TouchableOpacity style={s.callBtn}>
              <Ionicons name="call" size={18} color={C.white} />
            </TouchableOpacity>
          </View>

          {/* Route */}
          <View style={s.routeBox}>
            <View style={s.routeRow}>
              <View style={[s.dot, { backgroundColor: C.mapPickup }]} />
              <Text style={s.routeText} numberOfLines={2}>{activeBooking.pickupAddress}</Text>
            </View>
            <View style={s.routeArrow}><Ionicons name="arrow-down" size={14} color={C.textMuted} /></View>
            <View style={s.routeRow}>
              <View style={[s.dot, { backgroundColor: C.mapDropoff }]} />
              <Text style={s.routeText} numberOfLines={2}>{activeBooking.dropoffAddress}</Text>
            </View>
          </View>

          {/* Fare + payment */}
          <View style={s.fareRow}>
            <Text style={s.fareLabel}>Fare</Text>
            <Text style={s.fareValue}>£{activeBooking.estimatedFare?.toFixed(2)}</Text>
            <View style={s.paymentBadge}>
              <Text style={s.paymentBadgeText}>{activeBooking.paymentMethod}</Text>
            </View>
          </View>

          {/* Action button */}
          {actionLabel() !== '' && (
            <TouchableOpacity style={s.actionBtn} onPress={bookingStatusAction} disabled={isLoading} activeOpacity={0.85}>
              {isLoading
                ? <ActivityIndicator color={C.white} />
                : <Text style={s.actionBtnText}>{actionLabel()}</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Offline message */}
      {!isOnline && !activeBooking && (
        <View style={s.offlinePanel}>
          <Ionicons name="moon-outline" size={32} color={C.textMuted} />
          <Text style={s.offlineTitle}>You're offline</Text>
          <Text style={s.offlineSubtitle}>Tap "Go Online" to start accepting rides</Text>
        </View>
      )}

      {/* Waiting */}
      {isOnline && !activeBooking && !incomingBooking && (
        <View style={s.waitingPanel}>
          <View style={s.sheetHandle} />
          <View style={s.waitingContent}>
            <ActivityIndicator color={C.brand} size="small" />
            <Text style={s.waitingText}>Waiting for a booking request...</Text>
          </View>
        </View>
      )}

      {/* Incoming Booking Modal */}
      <Modal visible={!!incomingBooking} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.incomingModal}>
            <View style={s.timerBar}>
              <View style={[s.timerFill, { width: `${(acceptTimeout / 30) * 100}%` }]} />
            </View>
            <Text style={s.incomingTitle}>New Booking Request!</Text>
            <Text style={s.incomingTimer}>{acceptTimeout}s to accept</Text>

            {incomingBooking && (
              <>
                <View style={s.incomingRoute}>
                  <View style={s.routeRow}>
                    <View style={[s.dot, { backgroundColor: C.mapPickup }]} />
                    <Text style={s.routeText} numberOfLines={2}>{incomingBooking.pickupAddress}</Text>
                  </View>
                  <View style={s.routeArrow}><Ionicons name="arrow-down" size={14} color={C.textMuted} /></View>
                  <View style={s.routeRow}>
                    <View style={[s.dot, { backgroundColor: C.mapDropoff }]} />
                    <Text style={s.routeText} numberOfLines={2}>{incomingBooking.dropoffAddress}</Text>
                  </View>
                </View>

                <View style={s.incomingMeta}>
                  <View style={s.metaItem}>
                    <Ionicons name="car-outline" size={16} color={C.textMuted} />
                    <Text style={s.metaText}>{incomingBooking.vehicleType}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Ionicons name="cash-outline" size={16} color={C.textMuted} />
                    <Text style={s.metaText}>{incomingBooking.paymentMethod}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Ionicons name="wallet-outline" size={16} color={C.brand} />
                    <Text style={[s.metaText, { color: C.brand, fontWeight: '700' }]}>
                      £{incomingBooking.estimatedFare?.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={s.incomingActions}>
                  <TouchableOpacity style={s.rejectBtn} onPress={clearIncoming} activeOpacity={0.8}>
                    <Ionicons name="close" size={22} color={C.danger} />
                    <Text style={s.rejectText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.acceptBtn}
                    onPress={() => acceptMutation.mutate(incomingBooking.id)}
                    disabled={acceptMutation.isPending}
                    activeOpacity={0.85}
                  >
                    {acceptMutation.isPending
                      ? <ActivityIndicator color={C.white} />
                      : <>
                        <Ionicons name="checkmark" size={22} color={C.white} />
                        <Text style={s.acceptText}>Accept</Text>
                      </>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBarInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    margin: 12, padding: 12, backgroundColor: C.white + 'f5',
    borderRadius: Radius.xl, ...Shadow.md,
  },
  greetingName: { fontSize: 15, fontWeight: '700', color: C.text },
  greetingSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  onlineBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.full },
  onlineBtnActive: { backgroundColor: C.danger },
  onlineBtnInactive: { backgroundColor: C.success },
  onlineBtnText: { color: C.white, fontSize: 13, fontWeight: '700' },
  earningsStrip: {
    position: 'absolute', top: 110, left: 12, right: 12,
    backgroundColor: C.dark, borderRadius: Radius.xl,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    padding: 12, ...Shadow.md,
  },
  earningItem: { alignItems: 'center' },
  earningValue: { fontSize: 17, fontWeight: '800', color: C.white },
  earningLabel: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  earningDivider: { width: 1, height: 28, backgroundColor: '#334155' },
  sheetHandle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  activePanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, paddingBottom: 34, ...Shadow.lg,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: Radius.md, marginBottom: Spacing.md },
  statusText: { fontSize: 13, fontWeight: '600', flex: 1 },
  passengerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: C.surface, borderRadius: Radius.lg, marginBottom: Spacing.md },
  passengerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  passengerInitials: { fontSize: 16, fontWeight: '800', color: '#1d4ed8' },
  passengerName: { fontSize: 15, fontWeight: '600', color: C.text },
  passengerPhone: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center' },
  routeBox: { backgroundColor: C.surface, borderRadius: Radius.lg, padding: 14, marginBottom: Spacing.md },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 3, flexShrink: 0 },
  routeText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 18 },
  routeArrow: { marginLeft: 4, marginVertical: 2 },
  fareRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.md },
  fareLabel: { fontSize: 14, color: C.textMuted, flex: 1 },
  fareValue: { fontSize: 20, fontWeight: '800', color: C.brand },
  paymentBadge: { backgroundColor: C.surface2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  paymentBadgeText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  actionBtn: { backgroundColor: C.brand, borderRadius: Radius.lg, paddingVertical: 15, alignItems: 'center', ...Shadow.sm },
  actionBtnText: { color: C.white, fontSize: 16, fontWeight: '700' },
  offlinePanel: {
    position: 'absolute', bottom: 40, left: 24, right: 24,
    backgroundColor: C.white, borderRadius: Radius.xl, padding: Spacing.xl,
    alignItems: 'center', gap: 8, ...Shadow.md,
  },
  offlineTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  offlineSubtitle: { fontSize: 13, color: C.textMuted, textAlign: 'center' },
  waitingPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, paddingBottom: 34, ...Shadow.lg,
  },
  waitingContent: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  waitingText: { fontSize: 15, color: C.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  incomingModal: {
    backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: Spacing.xl, paddingBottom: 40,
  },
  timerBar: { height: 4, backgroundColor: C.surface2, borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
  timerFill: { height: '100%', backgroundColor: C.brand, borderRadius: 2 },
  incomingTitle: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 2 },
  incomingTimer: { fontSize: 13, color: C.textMuted, marginBottom: Spacing.lg },
  incomingRoute: { backgroundColor: C.surface, borderRadius: Radius.lg, padding: 14, marginBottom: Spacing.md },
  incomingMeta: { flexDirection: 'row', gap: 16, marginBottom: Spacing.xl },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 13, color: C.textMuted },
  incomingActions: { flexDirection: 'row', gap: 12 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 15, borderRadius: Radius.lg, borderWidth: 2, borderColor: '#fecaca', backgroundColor: '#fef2f2',
  },
  rejectText: { fontSize: 16, fontWeight: '700', color: C.danger },
  acceptBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 15, borderRadius: Radius.lg, backgroundColor: C.success, ...Shadow.sm,
  },
  acceptText: { fontSize: 16, fontWeight: '700', color: C.white },
});
