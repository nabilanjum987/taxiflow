// src/screens/bookings/BookingsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Colors, Spacing, Radius, Shadow } from '../../constants/theme';

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: Colors.success, CANCELLED: Colors.danger, IN_PROGRESS: Colors.info,
  ACCEPTED: Colors.info, SEARCHING: Colors.warning, PENDING: Colors.warning,
};

interface BookingItem {
  id: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare: number;
  actualFare?: number;
  vehicleType: string;
  paymentMethod: string;
  createdAt: string;
}

export default function BookingsScreen(): React.JSX.Element {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api.get('/bookings/my?limit=30').then(r => r.data.data as BookingItem[]),
  });

  const renderItem = ({ item }: { item: BookingItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] ?? Colors.textMuted }]} />
        <Text style={styles.statusText}>{item.status.replace(/_/g, ' ')}</Text>
        <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: Colors.mapPickup }]} />
          <Text style={styles.addressText} numberOfLines={1}>{item.pickupAddress}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: Colors.mapDropoff }]} />
          <Text style={styles.addressText} numberOfLines={1}>{item.dropoffAddress}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.vehicleType}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.paymentMethod}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={styles.fareText}>£{(item.actualFare ?? item.estimatedFare).toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Your Rides</Text>
      {isLoading ? (
        <ActivityIndicator color={Colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data ?? []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="car-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyTitle}>No rides yet</Text>
              <Text style={styles.emptyText}>Your booking history will appear here</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  list: { padding: Spacing.lg, gap: 12 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, flex: 1 },
  dateText: { fontSize: 11, color: Colors.textMuted },
  routeContainer: { marginBottom: Spacing.md },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  addressText: { fontSize: 13, color: Colors.text, flex: 1 },
  routeLine: { height: 16, width: 1, backgroundColor: Colors.border, marginLeft: 4.5, marginVertical: 2 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: Spacing.sm, borderTopWidth: 1, borderColor: Colors.border },
  badge: { backgroundColor: Colors.surface2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  badgeText: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  fareText: { fontSize: 16, fontWeight: '800', color: Colors.brand },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptyText: { fontSize: 13, color: Colors.textMuted },
});
