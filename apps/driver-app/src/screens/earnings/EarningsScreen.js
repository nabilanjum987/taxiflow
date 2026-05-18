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
exports.default = EarningsScreen;
// src/screens/earnings/EarningsScreen.tsx
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const react_query_1 = require("@tanstack/react-query");
const api_1 = __importDefault(require("../../lib/api"));
const theme_1 = require("../../constants/theme");
const PERIODS = [
    { label: 'Today', days: 1 },
    { label: '7 Days', days: 7 },
    { label: '30 Days', days: 30 },
];
function EarningsScreen() {
    const [selectedPeriod, setSelectedPeriod] = (0, react_1.useState)(7);
    const { data, isLoading } = (0, react_query_1.useQuery)({
        queryKey: ['my-earnings', selectedPeriod],
        queryFn: () => api_1.default.get(`/drivers/me/earnings?days=${selectedPeriod}`).then(r => r.data.data),
    });
    return (<react_native_safe_area_context_1.SafeAreaView style={s.container} edges={['top']}>
      <react_native_1.ScrollView showsVerticalScrollIndicator={false}>
        <react_native_1.Text style={s.title}>Earnings</react_native_1.Text>

        {/* Period selector */}
        <react_native_1.View style={s.periodRow}>
          {PERIODS.map(({ label, days }) => (<react_native_1.TouchableOpacity key={days} style={[s.periodBtn, selectedPeriod === days && s.periodBtnActive]} onPress={() => setSelectedPeriod(days)}>
              <react_native_1.Text style={[s.periodText, selectedPeriod === days && s.periodTextActive]}>{label}</react_native_1.Text>
            </react_native_1.TouchableOpacity>))}
        </react_native_1.View>

        {isLoading ? (<react_native_1.ActivityIndicator color={theme_1.Colors.brand} style={{ marginTop: 40 }}/>) : data ? (<>
            {/* Summary cards */}
            <react_native_1.View style={s.summaryGrid}>
              <react_native_1.View style={[s.summaryCard, { backgroundColor: theme_1.Colors.brand }]}>
                <vector_icons_1.Ionicons name="wallet" size={22} color={theme_1.Colors.white}/>
                <react_native_1.Text style={s.summaryValue}>£{data.totalEarnings?.toFixed(2) ?? '0.00'}</react_native_1.Text>
                <react_native_1.Text style={s.summaryLabel}>Total Earned</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={s.summaryCard}>
                <vector_icons_1.Ionicons name="car" size={22} color={theme_1.Colors.brand}/>
                <react_native_1.Text style={[s.summaryValue, { color: theme_1.Colors.text }]}>{data.totalTrips ?? 0}</react_native_1.Text>
                <react_native_1.Text style={[s.summaryLabel, { color: theme_1.Colors.textMuted }]}>Trips</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={s.summaryCard}>
                <vector_icons_1.Ionicons name="star" size={22} color={theme_1.Colors.brand}/>
                <react_native_1.Text style={[s.summaryValue, { color: theme_1.Colors.text }]}>{data.rating?.toFixed(1) ?? '—'}</react_native_1.Text>
                <react_native_1.Text style={[s.summaryLabel, { color: theme_1.Colors.textMuted }]}>Rating</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={s.summaryCard}>
                <vector_icons_1.Ionicons name="trending-up" size={22} color={theme_1.Colors.brand}/>
                <react_native_1.Text style={[s.summaryValue, { color: theme_1.Colors.text }]}>
                  £{data.totalTrips ? (data.totalEarnings / data.totalTrips).toFixed(2) : '0.00'}
                </react_native_1.Text>
                <react_native_1.Text style={[s.summaryLabel, { color: theme_1.Colors.textMuted }]}>Per Trip</react_native_1.Text>
              </react_native_1.View>
            </react_native_1.View>

            {/* All-time stats */}
            <react_native_1.View style={s.allTimeCard}>
              <react_native_1.Text style={s.sectionTitle}>All Time</react_native_1.Text>
              <react_native_1.View style={s.allTimeRow}>
                <react_native_1.View style={s.allTimeStat}>
                  <react_native_1.Text style={s.allTimeValue}>£{data.allTimeEarnings?.toFixed(2) ?? '0.00'}</react_native_1.Text>
                  <react_native_1.Text style={s.allTimeLabel}>Total Earned</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.View style={s.allTimeDivider}/>
                <react_native_1.View style={s.allTimeStat}>
                  <react_native_1.Text style={s.allTimeValue}>{data.allTimeTrips ?? 0}</react_native_1.Text>
                  <react_native_1.Text style={s.allTimeLabel}>Total Trips</react_native_1.Text>
                </react_native_1.View>
              </react_native_1.View>
            </react_native_1.View>

            {/* Daily breakdown */}
            {data.breakdown?.length > 0 && (<react_native_1.View style={s.section}>
                <react_native_1.Text style={s.sectionTitle}>Daily Breakdown</react_native_1.Text>
                {data.breakdown
                    .reverse()
                    .slice(0, 10)
                    .map((day) => (<react_native_1.View key={day.date} style={s.dayRow}>
                      <react_native_1.Text style={s.dayDate}>{new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}</react_native_1.Text>
                      <react_native_1.Text style={s.dayTrips}>{day.trips} trips</react_native_1.Text>
                      <react_native_1.Text style={s.dayEarnings}>£{day.earnings.toFixed(2)}</react_native_1.Text>
                    </react_native_1.View>))}
              </react_native_1.View>)}

            {/* Recent Trips */}
            {data.recentBookings?.length > 0 && (<react_native_1.View style={s.section}>
                <react_native_1.Text style={s.sectionTitle}>Recent Trips</react_native_1.Text>
                {data.recentBookings.map((trip) => (<react_native_1.View key={trip.id} style={s.tripRow}>
                    <react_native_1.View style={{ flex: 1 }}>
                      <react_native_1.Text style={s.tripPickup} numberOfLines={1}>{trip.pickupAddress}</react_native_1.Text>
                      <react_native_1.Text style={s.tripDropoff} numberOfLines={1}>→ {trip.dropoffAddress}</react_native_1.Text>
                      <react_native_1.Text style={s.tripDate}>{new Date(trip.completedAt).toLocaleString()}</react_native_1.Text>
                    </react_native_1.View>
                    <react_native_1.Text style={s.tripFare}>£{trip.actualFare?.toFixed(2)}</react_native_1.Text>
                  </react_native_1.View>))}
              </react_native_1.View>)}
          </>) : (<react_native_1.View style={s.empty}>
            <vector_icons_1.Ionicons name="wallet-outline" size={48} color={theme_1.Colors.border}/>
            <react_native_1.Text style={s.emptyText}>No earnings data yet</react_native_1.Text>
          </react_native_1.View>)}
      </react_native_1.ScrollView>
    </react_native_safe_area_context_1.SafeAreaView>);
}
const s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.surface },
    title: { fontSize: 24, fontWeight: '700', color: theme_1.Colors.text, padding: theme_1.Spacing.xl, paddingBottom: theme_1.Spacing.md },
    periodRow: { flexDirection: 'row', marginHorizontal: theme_1.Spacing.lg, marginBottom: theme_1.Spacing.md, backgroundColor: theme_1.Colors.surface2, borderRadius: theme_1.Radius.lg, padding: 4, gap: 4 },
    periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: theme_1.Radius.md },
    periodBtnActive: { backgroundColor: theme_1.Colors.white, ...theme_1.Shadow.sm },
    periodText: { fontSize: 13, color: theme_1.Colors.textMuted, fontWeight: '600' },
    periodTextActive: { color: theme_1.Colors.text },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', margin: theme_1.Spacing.lg, gap: 10 },
    summaryCard: { width: '47%', padding: theme_1.Spacing.lg, borderRadius: theme_1.Radius.xl, backgroundColor: theme_1.Colors.white, ...theme_1.Shadow.sm, borderWidth: 1, borderColor: theme_1.Colors.border, gap: 4 },
    summaryValue: { fontSize: 22, fontWeight: '800', color: theme_1.Colors.white, marginTop: 4 },
    summaryLabel: { fontSize: 12, color: theme_1.Colors.white + 'bb' },
    allTimeCard: { margin: theme_1.Spacing.lg, marginTop: 0, padding: theme_1.Spacing.lg, backgroundColor: theme_1.Colors.dark, borderRadius: theme_1.Radius.xl, ...theme_1.Shadow.md },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: theme_1.Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: theme_1.Spacing.md },
    allTimeRow: { flexDirection: 'row', alignItems: 'center' },
    allTimeStat: { flex: 1, alignItems: 'center' },
    allTimeValue: { fontSize: 24, fontWeight: '800', color: theme_1.Colors.white },
    allTimeLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
    allTimeDivider: { width: 1, height: 40, backgroundColor: '#334155' },
    section: { margin: theme_1.Spacing.lg, marginTop: 0, backgroundColor: theme_1.Colors.white, borderRadius: theme_1.Radius.xl, padding: theme_1.Spacing.lg, ...theme_1.Shadow.sm, borderWidth: 1, borderColor: theme_1.Colors.border },
    dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: theme_1.Colors.border },
    dayDate: { flex: 1, fontSize: 13, color: theme_1.Colors.text, fontWeight: '500' },
    dayTrips: { fontSize: 12, color: theme_1.Colors.textMuted, marginRight: theme_1.Spacing.md },
    dayEarnings: { fontSize: 14, fontWeight: '700', color: theme_1.Colors.brand },
    tripRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: theme_1.Colors.border, gap: 10 },
    tripPickup: { fontSize: 13, color: theme_1.Colors.text, fontWeight: '500' },
    tripDropoff: { fontSize: 12, color: theme_1.Colors.textMuted },
    tripDate: { fontSize: 11, color: theme_1.Colors.textMuted, marginTop: 2 },
    tripFare: { fontSize: 16, fontWeight: '800', color: theme_1.Colors.brand },
    empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
    emptyText: { fontSize: 14, color: theme_1.Colors.textMuted },
});
//# sourceMappingURL=EarningsScreen.js.map