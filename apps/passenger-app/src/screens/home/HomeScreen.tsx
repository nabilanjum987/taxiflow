// src/screens/home/HomeScreen.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, ScrollView, Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import api from '../../lib/api';
import { Colors, Spacing, Radius, Shadow } from '../../constants/theme';
import type { FareEstimate } from '@taxiflow/shared-types';

const { height: SCREEN_H } = Dimensions.get('window');

const VEHICLE_TYPES = [
  { value: 'STANDARD', label: 'Standard', icon: 'car-outline' as const, emoji: '🚗' },
  { value: 'EXECUTIVE', label: 'Executive', icon: 'car-sport-outline' as const, emoji: '🚙' },
  { value: 'MPV', label: 'MPV', icon: 'bus-outline' as const, emoji: '🚐' },
  { value: 'WAV', label: 'Accessible', icon: 'accessibility-outline' as const, emoji: '♿' },
] as const;

type VehicleType = typeof VEHICLE_TYPES[number]['value'];

export default function HomeScreen(): React.JSX.Element {
  const mapRef = useRef<MapView>(null);
  const { user } = useAuthStore();
  const { activeBooking, fareEstimate, setFareEstimate, setActiveBooking } = useBookingStore();

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'CASH'>('CASH');
  const [step, setStep] = useState<'idle' | 'selectVehicle' | 'confirming' | 'searching'>('idle');
  const [estimateLoading, setEstimateLoading] = useState(false);

  // Mock coordinates for demo — real app uses Places API geocoding
  const pickup = { latitude: 51.5074, longitude: -0.1278 };
  const dropoff = { latitude: 51.5200, longitude: -0.1000 };

  useEffect(() => {
    void requestLocation();
  }, []);

  const requestLocation = async (): Promise<void> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location Required', 'Please enable location access to use CityRide');
      return;
    }
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setUserLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
    mapRef.current?.animateToRegion({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 800);
  };

  const getEstimate = async (): Promise<void> => {
    if (!pickupAddress || !dropoffAddress) return;
    setEstimateLoading(true);
    try {
      const res = await api.get<{ data: FareEstimate }>('/bookings/fare-estimate', {
        params: {
          pickupLatitude: pickup.latitude,
          pickupLongitude: pickup.longitude,
          dropoffLatitude: dropoff.latitude,
          dropoffLongitude: dropoff.longitude,
          vehicleType: selectedVehicle,
        },
      });
      setFareEstimate(res.data.data);
      setStep('selectVehicle');
    } catch {
      Alert.alert('Error', 'Could not get fare estimate. Please try again.');
    } finally {
      setEstimateLoading(false);
    }
  };

  const bookingMutation = useMutation({
    mutationFn: () => api.post('/bookings', {
      pickupAddress,
      pickupLatitude: pickup.latitude,
      pickupLongitude: pickup.longitude,
      dropoffAddress,
      dropoffLatitude: dropoff.latitude,
      dropoffLongitude: dropoff.longitude,
      vehicleType: selectedVehicle,
      paymentMethod,
    }),
    onSuccess: (res) => {
      setActiveBooking(res.data.data);
      setStep('searching');
    },
    onError: () => {
      Alert.alert('Booking Failed', 'Could not create booking. Please try again.');
    },
  });

  const isActiveRide = activeBooking && !['COMPLETED', 'CANCELLED', 'NO_DRIVER_FOUND'].includes(activeBooking.status);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={{ latitude: 51.5074, longitude: -0.1278, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      >
        {pickupAddress && (
          <Marker coordinate={pickup} title="Pickup">
            <View style={styles.pickupMarker}><Ionicons name="location" size={20} color={Colors.white} /></View>
          </Marker>
        )}
        {dropoffAddress && (
          <Marker coordinate={dropoff} title="Drop-off">
            <View style={styles.dropoffMarker}><Ionicons name="flag" size={16} color={Colors.white} /></View>
          </Marker>
        )}
        {pickupAddress && dropoffAddress && (
          <Polyline coordinates={[pickup, dropoff]} strokeColor={Colors.brand} strokeWidth={3} lineDashPattern={[5, 5]} />
        )}
      </MapView>

      {/* My Location Button */}
      <TouchableOpacity style={styles.locationBtn} onPress={requestLocation}>
        <Ionicons name="locate" size={22} color={Colors.brand} />
      </TouchableOpacity>

      {/* Top greeting */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <Text style={styles.greeting}>Hello, {user?.firstName} 👋</Text>
      </SafeAreaView>

      {/* Bottom Sheet */}
      {!isActiveRide ? (
        <View style={styles.bottomSheet}>
          {step === 'idle' && (
            <>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Where to?</Text>
              <View style={styles.addressInputs}>
                <View style={styles.addressRow}>
                  <View style={[styles.dot, { backgroundColor: Colors.mapPickup }]} />
                  <TextInput
                    style={styles.addressInput}
                    value={pickupAddress}
                    onChangeText={setPickupAddress}
                    placeholder="Enter pickup location"
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType="next"
                  />
                </View>
                <View style={styles.divider} />
                <View style={styles.addressRow}>
                  <View style={[styles.dot, { backgroundColor: Colors.mapDropoff }]} />
                  <TextInput
                    style={styles.addressInput}
                    value={dropoffAddress}
                    onChangeText={setDropoffAddress}
                    placeholder="Enter destination"
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType="done"
                    onSubmitEditing={getEstimate}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[styles.btnPrimary, (!pickupAddress || !dropoffAddress) && styles.btnDisabled]}
                onPress={getEstimate}
                disabled={!pickupAddress || !dropoffAddress || estimateLoading}
                activeOpacity={0.85}
              >
                {estimateLoading
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={styles.btnPrimaryText}>Get Estimate</Text>
                }
              </TouchableOpacity>
            </>
          )}

          {step === 'selectVehicle' && (
            <>
              <View style={styles.sheetHandle} />
              <View style={styles.routeSummary}>
                <Text style={styles.routeText} numberOfLines={1}>{pickupAddress}</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.textMuted} />
                <Text style={styles.routeText} numberOfLines={1}>{dropoffAddress}</Text>
              </View>

              <Text style={styles.sectionLabel}>Choose vehicle</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll}>
                {VEHICLE_TYPES.map((v) => (
                  <TouchableOpacity
                    key={v.value}
                    style={[styles.vehicleCard, selectedVehicle === v.value && styles.vehicleCardSelected]}
                    onPress={() => setSelectedVehicle(v.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.vehicleEmoji}>{v.emoji}</Text>
                    <Text style={[styles.vehicleLabel, selectedVehicle === v.value && styles.vehicleLabelSelected]}>{v.label}</Text>
                    {fareEstimate && selectedVehicle === v.value && (
                      <Text style={styles.vehiclePrice}>
                        £{fareEstimate.estimatedFare.toFixed(2)}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {fareEstimate && (
                <View style={styles.fareBreakdown}>
                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>Distance</Text>
                    <Text style={styles.fareValue}>{fareEstimate.distanceKm?.toFixed(1)} km</Text>
                  </View>
                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>Duration (est)</Text>
                    <Text style={styles.fareValue}>{Math.round(fareEstimate.durationMinutes ?? 0)} min</Text>
                  </View>
                  <View style={[styles.fareRow, styles.fareTotalRow]}>
                    <Text style={styles.fareTotalLabel}>Estimated Fare</Text>
                    <Text style={styles.fareTotalValue}>£{fareEstimate.estimatedFare.toFixed(2)}</Text>
                  </View>
                </View>
              )}

              <Text style={styles.sectionLabel}>Payment</Text>
              <View style={styles.paymentRow}>
                {(['CASH', 'CARD'] as const).map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[styles.paymentBtn, paymentMethod === method && styles.paymentBtnSelected]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Ionicons
                      name={method === 'CASH' ? 'cash-outline' : 'card-outline'}
                      size={18}
                      color={paymentMethod === method ? Colors.white : Colors.textMuted}
                    />
                    <Text style={[styles.paymentText, paymentMethod === method && styles.paymentTextSelected]}>{method}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => bookingMutation.mutate()}
                disabled={bookingMutation.isPending}
                activeOpacity={0.85}
              >
                {bookingMutation.isPending
                  ? <ActivityIndicator color={Colors.white} />
                  : <>
                    <Ionicons name="car" size={18} color={Colors.white} />
                    <Text style={styles.btnPrimaryText}>Book Ride</Text>
                  </>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep('idle')} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'searching' && (
            <View style={styles.searchingContainer}>
              <View style={styles.sheetHandle} />
              <ActivityIndicator size="large" color={Colors.brand} style={{ marginBottom: 16 }} />
              <Text style={styles.searchingTitle}>Finding your driver...</Text>
              <Text style={styles.searchingSubtitle}>We're connecting you with the nearest available driver</Text>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => {
                  Alert.alert('Cancel Booking', 'Are you sure you want to cancel?', [
                    { text: 'No' },
                    { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
                      if (activeBooking) {
                        await api.patch(`/bookings/${activeBooking.id}/cancel`, { reason: 'Passenger cancelled' });
                        setActiveBooking(null);
                        setStep('idle');
                      }
                    }},
                  ]);
                }}
              >
                <Text style={styles.btnSecondaryText}>Cancel Search</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        /* Active Ride Panel */
        <ActiveRidePanel />
      )}
    </View>
  );
}

function ActiveRidePanel(): React.JSX.Element {
  const { activeBooking, driverLocation } = useBookingStore();
  if (!activeBooking) return <View />;
  const b = activeBooking;

  const statusMap: Record<string, { label: string; color: string; icon: string }> = {
    ACCEPTED: { label: 'Driver on the way', color: Colors.info, icon: 'car-outline' },
    DRIVER_ARRIVED: { label: 'Driver has arrived!', color: Colors.success, icon: 'checkmark-circle-outline' },
    IN_PROGRESS: { label: 'Ride in progress', color: Colors.brand, icon: 'navigate-outline' },
    COMPLETED: { label: 'Ride complete', color: Colors.success, icon: 'checkmark-circle' },
    CANCELLED: { label: 'Booking cancelled', color: Colors.danger, icon: 'close-circle-outline' },
  };

  const info = statusMap[b.status] ?? { label: b.status, color: Colors.textMuted, icon: 'time-outline' };

  return (
    <View style={styles.activeRideSheet}>
      <View style={styles.sheetHandle} />
      <View style={[styles.statusBanner, { backgroundColor: info.color + '15' }]}>
        <Ionicons name={info.icon as 'car'} size={20} color={info.color} />
        <Text style={[styles.statusLabel, { color: info.color }]}>{info.label}</Text>
      </View>

      {b.driver && (
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>
              {b.driver.user.firstName?.[0]}{b.driver.user.lastName?.[0]}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>{b.driver.user.firstName} {b.driver.user.lastName}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={Colors.brand} />
              <Text style={styles.ratingText}>{b.driver.rating?.toFixed(1) ?? '—'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.callBtn}>
            <Ionicons name="call" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.fareRow}>
        <Text style={styles.fareLabel}>Estimated Fare</Text>
        <Text style={styles.fareTotalValue}>£{b.estimatedFare?.toFixed(2)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: Spacing.xl, paddingTop: 8 },
  greeting: { fontSize: 16, fontWeight: '600', color: Colors.text, backgroundColor: Colors.white + 'ee', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, alignSelf: 'flex-start', ...Shadow.sm },
  locationBtn: {
    position: 'absolute', right: 16, bottom: 380,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.white, ...Shadow.md,
    alignItems: 'center', justifyContent: 'center',
  },
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, paddingBottom: 34, ...Shadow.lg, maxHeight: SCREEN_H * 0.65,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: Spacing.lg },
  addressInputs: { backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: Spacing.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  addressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  addressInput: { flex: 1, fontSize: 15, color: Colors.text, paddingVertical: 13 },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 34 },
  btnPrimary: { backgroundColor: Colors.brand, borderRadius: Radius.lg, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, ...Shadow.sm },
  btnPrimaryText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  btnSecondary: { backgroundColor: Colors.surface2, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center' },
  btnSecondaryText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { fontSize: 14, color: Colors.textMuted },
  routeSummary: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.lg, backgroundColor: Colors.surface, padding: 12, borderRadius: Radius.md },
  routeText: { flex: 1, fontSize: 12, color: Colors.textMuted },
  sectionLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  vehicleScroll: { marginBottom: Spacing.lg },
  vehicleCard: { width: 90, padding: 12, marginRight: 10, borderRadius: Radius.md, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center' },
  vehicleCardSelected: { borderColor: Colors.brand, backgroundColor: Colors.brandLight },
  vehicleEmoji: { fontSize: 24, marginBottom: 4 },
  vehicleLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  vehicleLabelSelected: { color: Colors.brandDark, fontWeight: '700' },
  vehiclePrice: { fontSize: 12, fontWeight: '700', color: Colors.brandDark, marginTop: 2 },
  fareBreakdown: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  fareLabel: { fontSize: 13, color: Colors.textMuted },
  fareValue: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  fareTotalRow: { borderTopWidth: 1, borderColor: Colors.border, marginTop: 6, paddingTop: 10 },
  fareTotalLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  fareTotalValue: { fontSize: 18, fontWeight: '800', color: Colors.brand },
  paymentRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  paymentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: Radius.md, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.surface },
  paymentBtnSelected: { borderColor: Colors.brand, backgroundColor: Colors.brand },
  paymentText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  paymentTextSelected: { color: Colors.white },
  searchingContainer: { alignItems: 'center', paddingVertical: Spacing.xl },
  searchingTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  searchingSubtitle: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.xl },
  activeRideSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, paddingBottom: 34, ...Shadow.lg,
  },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: Radius.md, marginBottom: Spacing.md },
  statusLabel: { fontSize: 15, fontWeight: '600' },
  driverCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: Spacing.md },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.brandLight, alignItems: 'center', justifyContent: 'center' },
  driverAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.brandDark },
  driverName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  ratingText: { fontSize: 12, color: Colors.textMuted },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center' },
  pickupMarker: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.mapPickup, alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
  dropoffMarker: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.mapDropoff, alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
});
