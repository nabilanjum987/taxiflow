"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BookingsScreen;
// src/screens/bookings/BookingsScreen.tsx
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const react_query_1 = require("@tanstack/react-query");
const api_1 = __importDefault(require("../../lib/api"));
const theme_1 = require("../../constants/theme");
const STATUS_COLORS = {
    COMPLETED: theme_1.Colors.success, CANCELLED: theme_1.Colors.danger, IN_PROGRESS: theme_1.Colors.info,
    ACCEPTED: theme_1.Colors.info, SEARCHING: theme_1.Colors.warning, PENDING: theme_1.Colors.warning,
};
function BookingsScreen() {
    const { data, isLoading, refetch } = (0, react_query_1.useQuery)({
        queryKey: ['my-bookings'],
        queryFn: () => api_1.default.get('/bookings/my?limit=30').then(r => r.data.data),
    });
    const renderItem = ({ item }) => (<react_native_1.View style={styles.card}>
      <react_native_1.View style={styles.cardHeader}>
        <react_native_1.View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] ?? theme_1.Colors.textMuted }]}/>
        <react_native_1.Text style={styles.statusText}>{item.status.replace(/_/g, ' ')}</react_native_1.Text>
        <react_native_1.Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</react_native_1.Text>
      </react_native_1.View>

      <react_native_1.View style={styles.routeContainer}>
        <react_native_1.View style={styles.routeRow}>
          <react_native_1.View style={[styles.dot, { backgroundColor: theme_1.Colors.mapPickup }]}/>
          <react_native_1.Text style={styles.addressText} numberOfLines={1}>{item.pickupAddress}</react_native_1.Text>
        </react_native_1.View>
        <react_native_1.View style={styles.routeLine}/>
        <react_native_1.View style={styles.routeRow}>
          <react_native_1.View style={[styles.dot, { backgroundColor: theme_1.Colors.mapDropoff }]}/>
          <react_native_1.Text style={styles.addressText} numberOfLines={1}>{item.dropoffAddress}</react_native_1.Text>
        </react_native_1.View>
      </react_native_1.View>

      <react_native_1.View style={styles.cardFooter}>
        <react_native_1.View style={styles.badge}>
          <react_native_1.Text style={styles.badgeText}>{item.vehicleType}</react_native_1.Text>
        </react_native_1.View>
        <react_native_1.View style={styles.badge}>
          <react_native_1.Text style={styles.badgeText}>{item.paymentMethod}</react_native_1.Text>
        </react_native_1.View>
        <react_native_1.View style={{ flex: 1 }}/>
        <react_native_1.Text style={styles.fareText}>£{(item.actualFare ?? item.estimatedFare).toFixed(2)}</react_native_1.Text>
      </react_native_1.View>
    </react_native_1.View>);
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container} edges={['top']}>
      <react_native_1.Text style={styles.title}>Your Rides</react_native_1.Text>
      {isLoading ? (<react_native_1.ActivityIndicator color={theme_1.Colors.brand} style={{ marginTop: 40 }}/>) : (<react_native_1.FlatList data={data ?? []} renderItem={renderItem} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} onRefresh={refetch} refreshing={isLoading} showsVerticalScrollIndicator={false} ListEmptyComponent={<react_native_1.View style={styles.empty}>
              <vector_icons_1.Ionicons name="car-outline" size={48} color={theme_1.Colors.border}/>
              <react_native_1.Text style={styles.emptyTitle}>No rides yet</react_native_1.Text>
              <react_native_1.Text style={styles.emptyText}>Your booking history will appear here</react_native_1.Text>
            </react_native_1.View>}/>)}
    </react_native_safe_area_context_1.SafeAreaView>);
}
const styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.surface },
    title: { fontSize: 24, fontWeight: '700', color: theme_1.Colors.text, paddingHorizontal: theme_1.Spacing.xl, paddingTop: theme_1.Spacing.lg, paddingBottom: theme_1.Spacing.md },
    list: { padding: theme_1.Spacing.lg, gap: 12 },
    card: { backgroundColor: theme_1.Colors.white, borderRadius: theme_1.Radius.xl, padding: theme_1.Spacing.lg, ...theme_1.Shadow.sm, borderWidth: 1, borderColor: theme_1.Colors.border },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme_1.Spacing.md, gap: 6 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 12, fontWeight: '600', color: theme_1.Colors.textSecondary, flex: 1 },
    dateText: { fontSize: 11, color: theme_1.Colors.textMuted },
    routeContainer: { marginBottom: theme_1.Spacing.md },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
    addressText: { fontSize: 13, color: theme_1.Colors.text, flex: 1 },
    routeLine: { height: 16, width: 1, backgroundColor: theme_1.Colors.border, marginLeft: 4.5, marginVertical: 2 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: theme_1.Spacing.sm, borderTopWidth: 1, borderColor: theme_1.Colors.border },
    badge: { backgroundColor: theme_1.Colors.surface2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme_1.Radius.sm },
    badgeText: { fontSize: 11, color: theme_1.Colors.textMuted, fontWeight: '500' },
    fareText: { fontSize: 16, fontWeight: '800', color: theme_1.Colors.brand },
    empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: theme_1.Colors.textSecondary },
    emptyText: { fontSize: 13, color: theme_1.Colors.textMuted },
});
//# sourceMappingURL=BookingsScreen.js.map