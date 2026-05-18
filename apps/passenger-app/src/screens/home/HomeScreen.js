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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HomeScreen;
// src/screens/home/HomeScreen.tsx
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_maps_1 = __importStar(require("react-native-maps"));
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const Location = __importStar(require("expo-location"));
const vector_icons_1 = require("@expo/vector-icons");
const react_query_1 = require("@tanstack/react-query");
const authStore_1 = require("../../store/authStore");
const bookingStore_1 = require("../../store/bookingStore");
const api_1 = __importDefault(require("../../lib/api"));
const theme_1 = require("../../constants/theme");
const { height: SCREEN_H } = react_native_1.Dimensions.get('window');
const VEHICLE_TYPES = [
    { value: 'STANDARD', label: 'Standard', icon: 'car-outline', emoji: '🚗' },
    { value: 'EXECUTIVE', label: 'Executive', icon: 'car-sport-outline', emoji: '🚙' },
    { value: 'MPV', label: 'MPV', icon: 'bus-outline', emoji: '🚐' },
    { value: 'WAV', label: 'Accessible', icon: 'accessibility-outline', emoji: '♿' },
];
function HomeScreen() {
    const mapRef = (0, react_1.useRef)(null);
    const { user } = (0, authStore_1.useAuthStore)();
    const { activeBooking, fareEstimate, setFareEstimate, setActiveBooking } = (0, bookingStore_1.useBookingStore)();
    const [userLocation, setUserLocation] = (0, react_1.useState)(null);
    const [pickupAddress, setPickupAddress] = (0, react_1.useState)('');
    const [dropoffAddress, setDropoffAddress] = (0, react_1.useState)('');
    const [selectedVehicle, setSelectedVehicle] = (0, react_1.useState)('STANDARD');
    const [paymentMethod, setPaymentMethod] = (0, react_1.useState)('CASH');
    const [step, setStep] = (0, react_1.useState)('idle');
    const [estimateLoading, setEstimateLoading] = (0, react_1.useState)(false);
    // Mock coordinates for demo — real app uses Places API geocoding
    const pickup = { latitude: 51.5074, longitude: -0.1278 };
    const dropoff = { latitude: 51.5200, longitude: -0.1000 };
    (0, react_1.useEffect)(() => {
        void requestLocation();
    }, []);
    const requestLocation = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            react_native_1.Alert.alert('Location Required', 'Please enable location access to use CityRide');
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
    const getEstimate = async () => {
        if (!pickupAddress || !dropoffAddress)
            return;
        setEstimateLoading(true);
        try {
            const res = await api_1.default.get('/bookings/fare-estimate', {
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
        }
        catch {
            react_native_1.Alert.alert('Error', 'Could not get fare estimate. Please try again.');
        }
        finally {
            setEstimateLoading(false);
        }
    };
    const bookingMutation = (0, react_query_1.useMutation)({
        mutationFn: () => api_1.default.post('/bookings', {
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
            react_native_1.Alert.alert('Booking Failed', 'Could not create booking. Please try again.');
        },
    });
    const isActiveRide = activeBooking && !['COMPLETED', 'CANCELLED', 'NO_DRIVER_FOUND'].includes(activeBooking.status);
    return (<react_native_1.View style={styles.container}>
      {/* Map */}
      <react_native_maps_1.default ref={mapRef} provider={react_native_maps_1.PROVIDER_GOOGLE} style={styles.map} showsUserLocation showsMyLocationButton={false} initialRegion={{ latitude: 51.5074, longitude: -0.1278, latitudeDelta: 0.05, longitudeDelta: 0.05 }}>
        {pickupAddress && (<react_native_maps_1.Marker coordinate={pickup} title="Pickup">
            <react_native_1.View style={styles.pickupMarker}><vector_icons_1.Ionicons name="location" size={20} color={theme_1.Colors.white}/></react_native_1.View>
          </react_native_maps_1.Marker>)}
        {dropoffAddress && (<react_native_maps_1.Marker coordinate={dropoff} title="Drop-off">
            <react_native_1.View style={styles.dropoffMarker}><vector_icons_1.Ionicons name="flag" size={16} color={theme_1.Colors.white}/></react_native_1.View>
          </react_native_maps_1.Marker>)}
        {pickupAddress && dropoffAddress && (<react_native_maps_1.Polyline coordinates={[pickup, dropoff]} strokeColor={theme_1.Colors.brand} strokeWidth={3} lineDashPattern={[5, 5]}/>)}
      </react_native_maps_1.default>

      {/* My Location Button */}
      <react_native_1.TouchableOpacity style={styles.locationBtn} onPress={requestLocation}>
        <vector_icons_1.Ionicons name="locate" size={22} color={theme_1.Colors.brand}/>
      </react_native_1.TouchableOpacity>

      {/* Top greeting */}
      <react_native_safe_area_context_1.SafeAreaView style={styles.topBar} edges={['top']}>
        <react_native_1.Text style={styles.greeting}>Hello, {user?.firstName} 👋</react_native_1.Text>
      </react_native_safe_area_context_1.SafeAreaView>

      {/* Bottom Sheet */}
      {!isActiveRide ? (<react_native_1.View style={styles.bottomSheet}>
          {step === 'idle' && (<>
              <react_native_1.View style={styles.sheetHandle}/>
              <react_native_1.Text style={styles.sheetTitle}>Where to?</react_native_1.Text>
              <react_native_1.View style={styles.addressInputs}>
                <react_native_1.View style={styles.addressRow}>
                  <react_native_1.View style={[styles.dot, { backgroundColor: theme_1.Colors.mapPickup }]}/>
                  <react_native_1.TextInput style={styles.addressInput} value={pickupAddress} onChangeText={setPickupAddress} placeholder="Enter pickup location" placeholderTextColor={theme_1.Colors.textMuted} returnKeyType="next"/>
                </react_native_1.View>
                <react_native_1.View style={styles.divider}/>
                <react_native_1.View style={styles.addressRow}>
                  <react_native_1.View style={[styles.dot, { backgroundColor: theme_1.Colors.mapDropoff }]}/>
                  <react_native_1.TextInput style={styles.addressInput} value={dropoffAddress} onChangeText={setDropoffAddress} placeholder="Enter destination" placeholderTextColor={theme_1.Colors.textMuted} returnKeyType="done" onSubmitEditing={getEstimate}/>
                </react_native_1.View>
              </react_native_1.View>
              <react_native_1.TouchableOpacity style={[styles.btnPrimary, (!pickupAddress || !dropoffAddress) && styles.btnDisabled]} onPress={getEstimate} disabled={!pickupAddress || !dropoffAddress || estimateLoading} activeOpacity={0.85}>
                {estimateLoading
                    ? <react_native_1.ActivityIndicator color={theme_1.Colors.white}/>
                    : <react_native_1.Text style={styles.btnPrimaryText}>Get Estimate</react_native_1.Text>}
              </react_native_1.TouchableOpacity>
            </>)}

          {step === 'selectVehicle' && (<>
              <react_native_1.View style={styles.sheetHandle}/>
              <react_native_1.View style={styles.routeSummary}>
                <react_native_1.Text style={styles.routeText} numberOfLines={1}>{pickupAddress}</react_native_1.Text>
                <vector_icons_1.Ionicons name="arrow-forward" size={14} color={theme_1.Colors.textMuted}/>
                <react_native_1.Text style={styles.routeText} numberOfLines={1}>{dropoffAddress}</react_native_1.Text>
              </react_native_1.View>

              <react_native_1.Text style={styles.sectionLabel}>Choose vehicle</react_native_1.Text>
              <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll}>
                {VEHICLE_TYPES.map((v) => (<react_native_1.TouchableOpacity key={v.value} style={[styles.vehicleCard, selectedVehicle === v.value && styles.vehicleCardSelected]} onPress={() => setSelectedVehicle(v.value)} activeOpacity={0.8}>
                    <react_native_1.Text style={styles.vehicleEmoji}>{v.emoji}</react_native_1.Text>
                    <react_native_1.Text style={[styles.vehicleLabel, selectedVehicle === v.value && styles.vehicleLabelSelected]}>{v.label}</react_native_1.Text>
                    {fareEstimate && selectedVehicle === v.value && (<react_native_1.Text style={styles.vehiclePrice}>
                        £{fareEstimate.estimatedFare.toFixed(2)}
                      </react_native_1.Text>)}
                  </react_native_1.TouchableOpacity>))}
              </react_native_1.ScrollView>

              {fareEstimate && (<react_native_1.View style={styles.fareBreakdown}>
                  <react_native_1.View style={styles.fareRow}>
                    <react_native_1.Text style={styles.fareLabel}>Distance</react_native_1.Text>
                    <react_native_1.Text style={styles.fareValue}>{fareEstimate.distanceKm?.toFixed(1)} km</react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.View style={styles.fareRow}>
                    <react_native_1.Text style={styles.fareLabel}>Duration (est)</react_native_1.Text>
                    <react_native_1.Text style={styles.fareValue}>{Math.round(fareEstimate.durationMinutes ?? 0)} min</react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.View style={[styles.fareRow, styles.fareTotalRow]}>
                    <react_native_1.Text style={styles.fareTotalLabel}>Estimated Fare</react_native_1.Text>
                    <react_native_1.Text style={styles.fareTotalValue}>£{fareEstimate.estimatedFare.toFixed(2)}</react_native_1.Text>
                  </react_native_1.View>
                </react_native_1.View>)}

              <react_native_1.Text style={styles.sectionLabel}>Payment</react_native_1.Text>
              <react_native_1.View style={styles.paymentRow}>
                {['CASH', 'CARD'].map((method) => (<react_native_1.TouchableOpacity key={method} style={[styles.paymentBtn, paymentMethod === method && styles.paymentBtnSelected]} onPress={() => setPaymentMethod(method)}>
                    <vector_icons_1.Ionicons name={method === 'CASH' ? 'cash-outline' : 'card-outline'} size={18} color={paymentMethod === method ? theme_1.Colors.white : theme_1.Colors.textMuted}/>
                    <react_native_1.Text style={[styles.paymentText, paymentMethod === method && styles.paymentTextSelected]}>{method}</react_native_1.Text>
                  </react_native_1.TouchableOpacity>))}
              </react_native_1.View>

              <react_native_1.TouchableOpacity style={styles.btnPrimary} onPress={() => bookingMutation.mutate()} disabled={bookingMutation.isPending} activeOpacity={0.85}>
                {bookingMutation.isPending
                    ? <react_native_1.ActivityIndicator color={theme_1.Colors.white}/>
                    : <>
                    <vector_icons_1.Ionicons name="car" size={18} color={theme_1.Colors.white}/>
                    <react_native_1.Text style={styles.btnPrimaryText}>Book Ride</react_native_1.Text>
                  </>}
              </react_native_1.TouchableOpacity>

              <react_native_1.TouchableOpacity onPress={() => setStep('idle')} style={styles.cancelBtn}>
                <react_native_1.Text style={styles.cancelText}>Cancel</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </>)}

          {step === 'searching' && (<react_native_1.View style={styles.searchingContainer}>
              <react_native_1.View style={styles.sheetHandle}/>
              <react_native_1.ActivityIndicator size="large" color={theme_1.Colors.brand} style={{ marginBottom: 16 }}/>
              <react_native_1.Text style={styles.searchingTitle}>Finding your driver...</react_native_1.Text>
              <react_native_1.Text style={styles.searchingSubtitle}>We're connecting you with the nearest available driver</react_native_1.Text>
              <react_native_1.TouchableOpacity style={styles.btnSecondary} onPress={() => {
                    react_native_1.Alert.alert('Cancel Booking', 'Are you sure you want to cancel?', [
                        { text: 'No' },
                        { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
                                if (activeBooking) {
                                    await api_1.default.patch(`/bookings/${activeBooking.id}/cancel`, { reason: 'Passenger cancelled' });
                                    setActiveBooking(null);
                                    setStep('idle');
                                }
                            } },
                    ]);
                }}>
                <react_native_1.Text style={styles.btnSecondaryText}>Cancel Search</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>)}
        </react_native_1.View>) : (
        /* Active Ride Panel */
        <ActiveRidePanel />)}
    </react_native_1.View>);
}
function ActiveRidePanel() {
    const { activeBooking, driverLocation } = (0, bookingStore_1.useBookingStore)();
    if (!activeBooking)
        return <react_native_1.View />;
    const b = activeBooking;
    const statusMap = {
        ACCEPTED: { label: 'Driver on the way', color: theme_1.Colors.info, icon: 'car-outline' },
        DRIVER_ARRIVED: { label: 'Driver has arrived!', color: theme_1.Colors.success, icon: 'checkmark-circle-outline' },
        IN_PROGRESS: { label: 'Ride in progress', color: theme_1.Colors.brand, icon: 'navigate-outline' },
        COMPLETED: { label: 'Ride complete', color: theme_1.Colors.success, icon: 'checkmark-circle' },
        CANCELLED: { label: 'Booking cancelled', color: theme_1.Colors.danger, icon: 'close-circle-outline' },
    };
    const info = statusMap[b.status] ?? { label: b.status, color: theme_1.Colors.textMuted, icon: 'time-outline' };
    return (<react_native_1.View style={styles.activeRideSheet}>
      <react_native_1.View style={styles.sheetHandle}/>
      <react_native_1.View style={[styles.statusBanner, { backgroundColor: info.color + '15' }]}>
        <vector_icons_1.Ionicons name={info.icon} size={20} color={info.color}/>
        <react_native_1.Text style={[styles.statusLabel, { color: info.color }]}>{info.label}</react_native_1.Text>
      </react_native_1.View>

      {b.driver && (<react_native_1.View style={styles.driverCard}>
          <react_native_1.View style={styles.driverAvatar}>
            <react_native_1.Text style={styles.driverAvatarText}>
              {b.driver.user.firstName?.[0]}{b.driver.user.lastName?.[0]}
            </react_native_1.Text>
          </react_native_1.View>
          <react_native_1.View style={{ flex: 1 }}>
            <react_native_1.Text style={styles.driverName}>{b.driver.user.firstName} {b.driver.user.lastName}</react_native_1.Text>
            <react_native_1.View style={styles.ratingRow}>
              <vector_icons_1.Ionicons name="star" size={12} color={theme_1.Colors.brand}/>
              <react_native_1.Text style={styles.ratingText}>{b.driver.rating?.toFixed(1) ?? '—'}</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>
          <react_native_1.TouchableOpacity style={styles.callBtn}>
            <vector_icons_1.Ionicons name="call" size={20} color={theme_1.Colors.white}/>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>)}

      <react_native_1.View style={styles.fareRow}>
        <react_native_1.Text style={styles.fareLabel}>Estimated Fare</react_native_1.Text>
        <react_native_1.Text style={styles.fareTotalValue}>£{b.estimatedFare?.toFixed(2)}</react_native_1.Text>
      </react_native_1.View>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: theme_1.Spacing.xl, paddingTop: 8 },
    greeting: { fontSize: 16, fontWeight: '600', color: theme_1.Colors.text, backgroundColor: theme_1.Colors.white + 'ee', paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme_1.Radius.full, alignSelf: 'flex-start', ...theme_1.Shadow.sm },
    locationBtn: {
        position: 'absolute', right: 16, bottom: 380,
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: theme_1.Colors.white, ...theme_1.Shadow.md,
        alignItems: 'center', justifyContent: 'center',
    },
    bottomSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: theme_1.Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: theme_1.Spacing.xl, paddingBottom: 34, ...theme_1.Shadow.lg, maxHeight: SCREEN_H * 0.65,
    },
    sheetHandle: { width: 36, height: 4, backgroundColor: theme_1.Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    sheetTitle: { fontSize: 20, fontWeight: '700', color: theme_1.Colors.text, marginBottom: theme_1.Spacing.lg },
    addressInputs: { backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, marginBottom: theme_1.Spacing.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme_1.Colors.border },
    addressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme_1.Spacing.md, paddingVertical: 2 },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
    addressInput: { flex: 1, fontSize: 15, color: theme_1.Colors.text, paddingVertical: 13 },
    divider: { height: 1, backgroundColor: theme_1.Colors.border, marginLeft: 34 },
    btnPrimary: { backgroundColor: theme_1.Colors.brand, borderRadius: theme_1.Radius.lg, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, ...theme_1.Shadow.sm },
    btnPrimaryText: { color: theme_1.Colors.white, fontSize: 16, fontWeight: '700' },
    btnDisabled: { opacity: 0.5 },
    btnSecondary: { backgroundColor: theme_1.Colors.surface2, borderRadius: theme_1.Radius.lg, paddingVertical: 14, alignItems: 'center' },
    btnSecondaryText: { color: theme_1.Colors.textSecondary, fontSize: 15, fontWeight: '600' },
    cancelBtn: { alignItems: 'center', paddingVertical: 12 },
    cancelText: { fontSize: 14, color: theme_1.Colors.textMuted },
    routeSummary: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme_1.Spacing.lg, backgroundColor: theme_1.Colors.surface, padding: 12, borderRadius: theme_1.Radius.md },
    routeText: { flex: 1, fontSize: 12, color: theme_1.Colors.textMuted },
    sectionLabel: { fontSize: 12, color: theme_1.Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: theme_1.Spacing.sm },
    vehicleScroll: { marginBottom: theme_1.Spacing.lg },
    vehicleCard: { width: 90, padding: 12, marginRight: 10, borderRadius: theme_1.Radius.md, borderWidth: 2, borderColor: theme_1.Colors.border, backgroundColor: theme_1.Colors.surface, alignItems: 'center' },
    vehicleCardSelected: { borderColor: theme_1.Colors.brand, backgroundColor: theme_1.Colors.brandLight },
    vehicleEmoji: { fontSize: 24, marginBottom: 4 },
    vehicleLabel: { fontSize: 11, color: theme_1.Colors.textMuted, fontWeight: '500' },
    vehicleLabelSelected: { color: theme_1.Colors.brandDark, fontWeight: '700' },
    vehiclePrice: { fontSize: 12, fontWeight: '700', color: theme_1.Colors.brandDark, marginTop: 2 },
    fareBreakdown: { backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.md, padding: theme_1.Spacing.md, marginBottom: theme_1.Spacing.lg },
    fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    fareLabel: { fontSize: 13, color: theme_1.Colors.textMuted },
    fareValue: { fontSize: 13, color: theme_1.Colors.text, fontWeight: '500' },
    fareTotalRow: { borderTopWidth: 1, borderColor: theme_1.Colors.border, marginTop: 6, paddingTop: 10 },
    fareTotalLabel: { fontSize: 15, fontWeight: '600', color: theme_1.Colors.text },
    fareTotalValue: { fontSize: 18, fontWeight: '800', color: theme_1.Colors.brand },
    paymentRow: { flexDirection: 'row', gap: 10, marginBottom: theme_1.Spacing.lg },
    paymentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: theme_1.Radius.md, borderWidth: 2, borderColor: theme_1.Colors.border, backgroundColor: theme_1.Colors.surface },
    paymentBtnSelected: { borderColor: theme_1.Colors.brand, backgroundColor: theme_1.Colors.brand },
    paymentText: { fontSize: 13, color: theme_1.Colors.textMuted, fontWeight: '600' },
    paymentTextSelected: { color: theme_1.Colors.white },
    searchingContainer: { alignItems: 'center', paddingVertical: theme_1.Spacing.xl },
    searchingTitle: { fontSize: 18, fontWeight: '700', color: theme_1.Colors.text, marginBottom: 8 },
    searchingSubtitle: { fontSize: 13, color: theme_1.Colors.textMuted, textAlign: 'center', marginBottom: theme_1.Spacing.xl },
    activeRideSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: theme_1.Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: theme_1.Spacing.xl, paddingBottom: 34, ...theme_1.Shadow.lg,
    },
    statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: theme_1.Radius.md, marginBottom: theme_1.Spacing.md },
    statusLabel: { fontSize: 15, fontWeight: '600' },
    driverCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, marginBottom: theme_1.Spacing.md },
    driverAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme_1.Colors.brandLight, alignItems: 'center', justifyContent: 'center' },
    driverAvatarText: { fontSize: 16, fontWeight: '700', color: theme_1.Colors.brandDark },
    driverName: { fontSize: 15, fontWeight: '600', color: theme_1.Colors.text },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
    ratingText: { fontSize: 12, color: theme_1.Colors.textMuted },
    callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme_1.Colors.success, alignItems: 'center', justifyContent: 'center' },
    pickupMarker: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme_1.Colors.mapPickup, alignItems: 'center', justifyContent: 'center', ...theme_1.Shadow.sm },
    dropoffMarker: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme_1.Colors.mapDropoff, alignItems: 'center', justifyContent: 'center', ...theme_1.Shadow.sm },
});
//# sourceMappingURL=HomeScreen.js.map