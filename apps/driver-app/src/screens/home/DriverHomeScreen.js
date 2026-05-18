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
exports.default = DriverHomeScreen;
// src/screens/home/DriverHomeScreen.tsx
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_maps_1 = __importStar(require("react-native-maps"));
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const Location = __importStar(require("expo-location"));
const react_query_1 = require("@tanstack/react-query");
const stores_1 = require("../store/stores");
const useDriverSocket_1 = require("../hooks/useDriverSocket");
const api_1 = __importDefault(require("../lib/api"));
const theme_1 = require("../constants/theme");
// Theme copy — same tokens as passenger app
const C = theme_1.Colors;
function DriverHomeScreen() {
    const { user } = (0, stores_1.useAuthStore)();
    const { isOnline, setOnline, activeBooking, setActiveBooking, incomingBooking, clearIncoming } = (0, stores_1.useDriverStore)();
    const [userLocation, setUserLocation] = (0, react_1.useState)(null);
    const [acceptTimeout, setAcceptTimeout] = (0, react_1.useState)(30);
    // Connect socket + start GPS
    (0, useDriverSocket_1.useDriverSocket)();
    // Countdown timer for incoming booking
    (0, react_1.useEffect)(() => {
        if (!incomingBooking)
            return;
        setAcceptTimeout(30);
        react_native_1.Vibration.vibrate([0, 300, 200, 300, 200, 300]);
        const timer = setInterval(() => {
            setAcceptTimeout(t => {
                if (t <= 1) {
                    clearIncoming();
                    clearInterval(timer);
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [incomingBooking?.id]);
    (0, react_1.useEffect)(() => { void requestLocation(); }, []);
    const requestLocation = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted')
            return;
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    };
    const toggleOnlineMutation = (0, react_query_1.useMutation)({
        mutationFn: (online) => api_1.default.patch('/drivers/me/status', { online }),
        onSuccess: (_, online) => {
            setOnline(online);
        },
        onError: () => react_native_1.Alert.alert('Error', 'Could not update status. Check your connection.'),
    });
    const acceptMutation = (0, react_query_1.useMutation)({
        mutationFn: (bookingId) => api_1.default.post(`/bookings/${bookingId}/accept`),
        onSuccess: (res) => {
            setActiveBooking(res.data.data);
            clearIncoming();
        },
        onError: () => {
            react_native_1.Alert.alert('Booking Taken', 'Another driver accepted this ride first.');
            clearIncoming();
        },
    });
    const arrivedMutation = (0, react_query_1.useMutation)({
        mutationFn: (bookingId) => api_1.default.post(`/bookings/${bookingId}/arrived`),
        onSuccess: (res) => setActiveBooking(res.data.data),
    });
    const startRideMutation = (0, react_query_1.useMutation)({
        mutationFn: (bookingId) => api_1.default.post(`/bookings/${bookingId}/start`),
        onSuccess: (res) => setActiveBooking(res.data.data),
    });
    const completeRideMutation = (0, react_query_1.useMutation)({
        mutationFn: (bookingId) => api_1.default.post(`/bookings/${bookingId}/complete`),
        onSuccess: () => {
            setActiveBooking(null);
            react_native_1.Alert.alert('Ride Complete! 🎉', 'Your earnings have been updated.');
        },
    });
    const { data: earningsData } = (0, react_query_1.useQuery)({
        queryKey: ['driver-earnings-today'],
        queryFn: async () => {
            const driverRes = await api_1.default.get('/drivers/me');
            const driver = driverRes.data.data;
            return api_1.default.get(`/drivers/me/earnings?days=1`).then(r => r.data.data);
        },
        refetchInterval: 60_000,
    });
    const handleToggleOnline = () => {
        if (!isOnline) {
            react_native_1.Alert.alert('Go Online', 'You will start receiving booking requests.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Go Online', onPress: () => toggleOnlineMutation.mutate(true) },
            ]);
        }
        else {
            if (activeBooking) {
                react_native_1.Alert.alert('Active Trip', 'Complete your current trip before going offline.');
                return;
            }
            toggleOnlineMutation.mutate(false);
        }
    };
    const bookingStatusAction = () => {
        if (!activeBooking)
            return;
        const { id, status } = activeBooking;
        if (status === 'ACCEPTED')
            arrivedMutation.mutate(id);
        else if (status === 'DRIVER_ARRIVED')
            startRideMutation.mutate(id);
        else if (status === 'IN_PROGRESS') {
            react_native_1.Alert.alert('Complete Ride', 'Confirm the passenger has been dropped off?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Complete', onPress: () => completeRideMutation.mutate(id) },
            ]);
        }
    };
    const actionLabel = () => {
        if (!activeBooking)
            return '';
        const map = {
            ACCEPTED: "I've Arrived at Pickup",
            DRIVER_ARRIVED: 'Start Ride',
            IN_PROGRESS: 'Complete Ride',
        };
        return map[activeBooking.status] ?? '';
    };
    const isLoading = arrivedMutation.isPending || startRideMutation.isPending || completeRideMutation.isPending;
    return (<react_native_1.View style={s.container}>
      {/* Map */}
      <react_native_maps_1.default provider={react_native_maps_1.PROVIDER_GOOGLE} style={s.map} showsUserLocation showsMyLocationButton={false} initialRegion={userLocation
            ? { ...userLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 }
            : { latitude: 51.5074, longitude: -0.1278, latitudeDelta: 0.05, longitudeDelta: 0.05 }}/>

      {/* Status + greeting bar */}
      <react_native_safe_area_context_1.SafeAreaView style={s.topBar} edges={['top']}>
        <react_native_1.View style={s.topBarInner}>
          <react_native_1.View>
            <react_native_1.Text style={s.greetingName}>Hi, {user?.firstName} 👋</react_native_1.Text>
            <react_native_1.Text style={s.greetingSub}>{isOnline ? '🟢 Online — accepting rides' : '⚪ Offline'}</react_native_1.Text>
          </react_native_1.View>
          <react_native_1.TouchableOpacity style={[s.onlineBtn, isOnline ? s.onlineBtnActive : s.onlineBtnInactive]} onPress={handleToggleOnline} disabled={toggleOnlineMutation.isPending}>
            {toggleOnlineMutation.isPending
            ? <react_native_1.ActivityIndicator size="small" color={C.white}/>
            : <react_native_1.Text style={s.onlineBtnText}>{isOnline ? 'Go Offline' : 'Go Online'}</react_native_1.Text>}
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      </react_native_safe_area_context_1.SafeAreaView>

      {/* Earnings strip */}
      {earningsData && (<react_native_1.View style={s.earningsStrip}>
          <react_native_1.View style={s.earningItem}>
            <react_native_1.Text style={s.earningValue}>£{earningsData.totalEarnings?.toFixed(2) ?? '0.00'}</react_native_1.Text>
            <react_native_1.Text style={s.earningLabel}>Today</react_native_1.Text>
          </react_native_1.View>
          <react_native_1.View style={s.earningDivider}/>
          <react_native_1.View style={s.earningItem}>
            <react_native_1.Text style={s.earningValue}>{earningsData.totalTrips ?? 0}</react_native_1.Text>
            <react_native_1.Text style={s.earningLabel}>Trips</react_native_1.Text>
          </react_native_1.View>
          <react_native_1.View style={s.earningDivider}/>
          <react_native_1.View style={s.earningItem}>
            <react_native_1.Text style={s.earningValue}>★ {earningsData.rating?.toFixed(1) ?? '—'}</react_native_1.Text>
            <react_native_1.Text style={s.earningLabel}>Rating</react_native_1.Text>
          </react_native_1.View>
        </react_native_1.View>)}

      {/* Active Trip Panel */}
      {activeBooking && (<react_native_1.View style={s.activePanel}>
          <react_native_1.View style={s.sheetHandle}/>

          {/* Status */}
          <react_native_1.View style={[s.statusRow, { backgroundColor: activeBooking.status === 'IN_PROGRESS' ? C.brand + '15' : C.info + '15' }]}>
            <vector_icons_1.Ionicons name={activeBooking.status === 'IN_PROGRESS' ? 'navigate' : 'car'} size={18} color={activeBooking.status === 'IN_PROGRESS' ? C.brand : C.info}/>
            <react_native_1.Text style={[s.statusText, { color: activeBooking.status === 'IN_PROGRESS' ? C.brand : C.info }]}>
              {activeBooking.status === 'ACCEPTED' && 'Head to pickup location'}
              {activeBooking.status === 'DRIVER_ARRIVED' && 'Waiting for passenger'}
              {activeBooking.status === 'IN_PROGRESS' && 'Trip in progress — navigate to destination'}
            </react_native_1.Text>
          </react_native_1.View>

          {/* Passenger info */}
          <react_native_1.View style={s.passengerCard}>
            <react_native_1.View style={s.passengerAvatar}>
              <react_native_1.Text style={s.passengerInitials}>
                {activeBooking.passenger?.user?.firstName?.[0]}{activeBooking.passenger?.user?.lastName?.[0]}
              </react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={{ flex: 1 }}>
              <react_native_1.Text style={s.passengerName}>
                {activeBooking.passenger?.user?.firstName} {activeBooking.passenger?.user?.lastName}
              </react_native_1.Text>
              <react_native_1.Text style={s.passengerPhone}>{activeBooking.passenger?.user?.phone}</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.TouchableOpacity style={s.callBtn}>
              <vector_icons_1.Ionicons name="call" size={18} color={C.white}/>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>

          {/* Route */}
          <react_native_1.View style={s.routeBox}>
            <react_native_1.View style={s.routeRow}>
              <react_native_1.View style={[s.dot, { backgroundColor: C.mapPickup }]}/>
              <react_native_1.Text style={s.routeText} numberOfLines={2}>{activeBooking.pickupAddress}</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={s.routeArrow}><vector_icons_1.Ionicons name="arrow-down" size={14} color={C.textMuted}/></react_native_1.View>
            <react_native_1.View style={s.routeRow}>
              <react_native_1.View style={[s.dot, { backgroundColor: C.mapDropoff }]}/>
              <react_native_1.Text style={s.routeText} numberOfLines={2}>{activeBooking.dropoffAddress}</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>

          {/* Fare + payment */}
          <react_native_1.View style={s.fareRow}>
            <react_native_1.Text style={s.fareLabel}>Fare</react_native_1.Text>
            <react_native_1.Text style={s.fareValue}>£{activeBooking.estimatedFare?.toFixed(2)}</react_native_1.Text>
            <react_native_1.View style={s.paymentBadge}>
              <react_native_1.Text style={s.paymentBadgeText}>{activeBooking.paymentMethod}</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>

          {/* Action button */}
          {actionLabel() !== '' && (<react_native_1.TouchableOpacity style={s.actionBtn} onPress={bookingStatusAction} disabled={isLoading} activeOpacity={0.85}>
              {isLoading
                    ? <react_native_1.ActivityIndicator color={C.white}/>
                    : <react_native_1.Text style={s.actionBtnText}>{actionLabel()}</react_native_1.Text>}
            </react_native_1.TouchableOpacity>)}
        </react_native_1.View>)}

      {/* Offline message */}
      {!isOnline && !activeBooking && (<react_native_1.View style={s.offlinePanel}>
          <vector_icons_1.Ionicons name="moon-outline" size={32} color={C.textMuted}/>
          <react_native_1.Text style={s.offlineTitle}>You're offline</react_native_1.Text>
          <react_native_1.Text style={s.offlineSubtitle}>Tap "Go Online" to start accepting rides</react_native_1.Text>
        </react_native_1.View>)}

      {/* Waiting */}
      {isOnline && !activeBooking && !incomingBooking && (<react_native_1.View style={s.waitingPanel}>
          <react_native_1.View style={s.sheetHandle}/>
          <react_native_1.View style={s.waitingContent}>
            <react_native_1.ActivityIndicator color={C.brand} size="small"/>
            <react_native_1.Text style={s.waitingText}>Waiting for a booking request...</react_native_1.Text>
          </react_native_1.View>
        </react_native_1.View>)}

      {/* Incoming Booking Modal */}
      <react_native_1.Modal visible={!!incomingBooking} transparent animationType="slide">
        <react_native_1.View style={s.modalOverlay}>
          <react_native_1.View style={s.incomingModal}>
            <react_native_1.View style={s.timerBar}>
              <react_native_1.View style={[s.timerFill, { width: `${(acceptTimeout / 30) * 100}%` }]}/>
            </react_native_1.View>
            <react_native_1.Text style={s.incomingTitle}>New Booking Request!</react_native_1.Text>
            <react_native_1.Text style={s.incomingTimer}>{acceptTimeout}s to accept</react_native_1.Text>

            {incomingBooking && (<>
                <react_native_1.View style={s.incomingRoute}>
                  <react_native_1.View style={s.routeRow}>
                    <react_native_1.View style={[s.dot, { backgroundColor: C.mapPickup }]}/>
                    <react_native_1.Text style={s.routeText} numberOfLines={2}>{incomingBooking.pickupAddress}</react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.View style={s.routeArrow}><vector_icons_1.Ionicons name="arrow-down" size={14} color={C.textMuted}/></react_native_1.View>
                  <react_native_1.View style={s.routeRow}>
                    <react_native_1.View style={[s.dot, { backgroundColor: C.mapDropoff }]}/>
                    <react_native_1.Text style={s.routeText} numberOfLines={2}>{incomingBooking.dropoffAddress}</react_native_1.Text>
                  </react_native_1.View>
                </react_native_1.View>

                <react_native_1.View style={s.incomingMeta}>
                  <react_native_1.View style={s.metaItem}>
                    <vector_icons_1.Ionicons name="car-outline" size={16} color={C.textMuted}/>
                    <react_native_1.Text style={s.metaText}>{incomingBooking.vehicleType}</react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.View style={s.metaItem}>
                    <vector_icons_1.Ionicons name="cash-outline" size={16} color={C.textMuted}/>
                    <react_native_1.Text style={s.metaText}>{incomingBooking.paymentMethod}</react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.View style={s.metaItem}>
                    <vector_icons_1.Ionicons name="wallet-outline" size={16} color={C.brand}/>
                    <react_native_1.Text style={[s.metaText, { color: C.brand, fontWeight: '700' }]}>
                      £{incomingBooking.estimatedFare?.toFixed(2)}
                    </react_native_1.Text>
                  </react_native_1.View>
                </react_native_1.View>

                <react_native_1.View style={s.incomingActions}>
                  <react_native_1.TouchableOpacity style={s.rejectBtn} onPress={clearIncoming} activeOpacity={0.8}>
                    <vector_icons_1.Ionicons name="close" size={22} color={C.danger}/>
                    <react_native_1.Text style={s.rejectText}>Decline</react_native_1.Text>
                  </react_native_1.TouchableOpacity>
                  <react_native_1.TouchableOpacity style={s.acceptBtn} onPress={() => acceptMutation.mutate(incomingBooking.id)} disabled={acceptMutation.isPending} activeOpacity={0.85}>
                    {acceptMutation.isPending
                ? <react_native_1.ActivityIndicator color={C.white}/>
                : <>
                        <vector_icons_1.Ionicons name="checkmark" size={22} color={C.white}/>
                        <react_native_1.Text style={s.acceptText}>Accept</react_native_1.Text>
                      </>}
                  </react_native_1.TouchableOpacity>
                </react_native_1.View>
              </>)}
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>
    </react_native_1.View>);
}
const s = react_native_1.StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    topBar: { position: 'absolute', top: 0, left: 0, right: 0 },
    topBarInner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        margin: 12, padding: 12, backgroundColor: C.white + 'f5',
        borderRadius: theme_1.Radius.xl, ...theme_1.Shadow.md,
    },
    greetingName: { fontSize: 15, fontWeight: '700', color: C.text },
    greetingSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
    onlineBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: theme_1.Radius.full },
    onlineBtnActive: { backgroundColor: C.danger },
    onlineBtnInactive: { backgroundColor: C.success },
    onlineBtnText: { color: C.white, fontSize: 13, fontWeight: '700' },
    earningsStrip: {
        position: 'absolute', top: 110, left: 12, right: 12,
        backgroundColor: C.dark, borderRadius: theme_1.Radius.xl,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
        padding: 12, ...theme_1.Shadow.md,
    },
    earningItem: { alignItems: 'center' },
    earningValue: { fontSize: 17, fontWeight: '800', color: C.white },
    earningLabel: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
    earningDivider: { width: 1, height: 28, backgroundColor: '#334155' },
    sheetHandle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
    activePanel: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: theme_1.Spacing.xl, paddingBottom: 34, ...theme_1.Shadow.lg,
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: theme_1.Radius.md, marginBottom: theme_1.Spacing.md },
    statusText: { fontSize: 13, fontWeight: '600', flex: 1 },
    passengerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: C.surface, borderRadius: theme_1.Radius.lg, marginBottom: theme_1.Spacing.md },
    passengerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
    passengerInitials: { fontSize: 16, fontWeight: '800', color: '#1d4ed8' },
    passengerName: { fontSize: 15, fontWeight: '600', color: C.text },
    passengerPhone: { fontSize: 12, color: C.textMuted, marginTop: 2 },
    callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center' },
    routeBox: { backgroundColor: C.surface, borderRadius: theme_1.Radius.lg, padding: 14, marginBottom: theme_1.Spacing.md },
    routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    dot: { width: 10, height: 10, borderRadius: 5, marginTop: 3, flexShrink: 0 },
    routeText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 18 },
    routeArrow: { marginLeft: 4, marginVertical: 2 },
    fareRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: theme_1.Spacing.md },
    fareLabel: { fontSize: 14, color: C.textMuted, flex: 1 },
    fareValue: { fontSize: 20, fontWeight: '800', color: C.brand },
    paymentBadge: { backgroundColor: C.surface2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme_1.Radius.full },
    paymentBadgeText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
    actionBtn: { backgroundColor: C.brand, borderRadius: theme_1.Radius.lg, paddingVertical: 15, alignItems: 'center', ...theme_1.Shadow.sm },
    actionBtnText: { color: C.white, fontSize: 16, fontWeight: '700' },
    offlinePanel: {
        position: 'absolute', bottom: 40, left: 24, right: 24,
        backgroundColor: C.white, borderRadius: theme_1.Radius.xl, padding: theme_1.Spacing.xl,
        alignItems: 'center', gap: 8, ...theme_1.Shadow.md,
    },
    offlineTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    offlineSubtitle: { fontSize: 13, color: C.textMuted, textAlign: 'center' },
    waitingPanel: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: theme_1.Spacing.xl, paddingBottom: 34, ...theme_1.Shadow.lg,
    },
    waitingContent: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
    waitingText: { fontSize: 15, color: C.textMuted },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    incomingModal: {
        backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: theme_1.Spacing.xl, paddingBottom: 40,
    },
    timerBar: { height: 4, backgroundColor: C.surface2, borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
    timerFill: { height: '100%', backgroundColor: C.brand, borderRadius: 2 },
    incomingTitle: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 2 },
    incomingTimer: { fontSize: 13, color: C.textMuted, marginBottom: theme_1.Spacing.lg },
    incomingRoute: { backgroundColor: C.surface, borderRadius: theme_1.Radius.lg, padding: 14, marginBottom: theme_1.Spacing.md },
    incomingMeta: { flexDirection: 'row', gap: 16, marginBottom: theme_1.Spacing.xl },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaText: { fontSize: 13, color: C.textMuted },
    incomingActions: { flexDirection: 'row', gap: 12 },
    rejectBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 15, borderRadius: theme_1.Radius.lg, borderWidth: 2, borderColor: '#fecaca', backgroundColor: '#fef2f2',
    },
    rejectText: { fontSize: 16, fontWeight: '700', color: C.danger },
    acceptBtn: {
        flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 15, borderRadius: theme_1.Radius.lg, backgroundColor: C.success, ...theme_1.Shadow.sm,
    },
    acceptText: { fontSize: 16, fontWeight: '700', color: C.white },
});
//# sourceMappingURL=DriverHomeScreen.js.map