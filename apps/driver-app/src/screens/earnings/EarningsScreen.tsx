// src/screens/earnings/EarningsScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Colors, Spacing, Radius, Shadow } from '../../constants/theme';

const PERIODS = [
  { label: 'Today', days: 1 },
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
];

export default function EarningsScreen(): React.JSX.Element {
  const [selectedPeriod, setSelectedPeriod] = useState(7);

  const { data, isLoading } = useQuery({
    queryKey: ['my-earnings', selectedPeriod],
    queryFn: () => api.get(`/drivers/me/earnings?days=${selectedPeriod}`).then(r => r.data.data),
  });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Earnings</Text>

        {/* Period selector */}
        <View style={s.periodRow}>
          {PERIODS.map(({ label, days }) => (
            <TouchableOpacity
              key={days}
              style={[s.periodBtn, selectedPeriod === days && s.periodBtnActive]}
              onPress={() => setSelectedPeriod(days)}
            >
              <Text style={[s.periodText, selectedPeriod === days && s.periodTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.brand} style={{ marginTop: 40 }} />
        ) : data ? (
          <>
            {/* Summary cards */}
            <View style={s.summaryGrid}>
              <View style={[s.summaryCard, { backgroundColor: Colors.brand }]}>
                <Ionicons name="wallet" size={22} color={Colors.white} />
                <Text style={s.summaryValue}>£{data.totalEarnings?.toFixed(2) ?? '0.00'}</Text>
                <Text style={s.summaryLabel}>Total Earned</Text>
              </View>
              <View style={s.summaryCard}>
                <Ionicons name="car" size={22} color={Colors.brand} />
                <Text style={[s.summaryValue, { color: Colors.text }]}>{data.totalTrips ?? 0}</Text>
                <Text style={[s.summaryLabel, { color: Colors.textMuted }]}>Trips</Text>
              </View>
              <View style={s.summaryCard}>
                <Ionicons name="star" size={22} color={Colors.brand} />
                <Text style={[s.summaryValue, { color: Colors.text }]}>{data.rating?.toFixed(1) ?? '—'}</Text>
                <Text style={[s.summaryLabel, { color: Colors.textMuted }]}>Rating</Text>
              </View>
              <View style={s.summaryCard}>
                <Ionicons name="trending-up" size={22} color={Colors.brand} />
                <Text style={[s.summaryValue, { color: Colors.text }]}>
                  £{data.totalTrips ? (data.totalEarnings / data.totalTrips).toFixed(2) : '0.00'}
                </Text>
                <Text style={[s.summaryLabel, { color: Colors.textMuted }]}>Per Trip</Text>
              </View>
            </View>

            {/* All-time stats */}
            <View style={s.allTimeCard}>
              <Text style={s.sectionTitle}>All Time</Text>
              <View style={s.allTimeRow}>
                <View style={s.allTimeStat}>
                  <Text style={s.allTimeValue}>£{data.allTimeEarnings?.toFixed(2) ?? '0.00'}</Text>
                  <Text style={s.allTimeLabel}>Total Earned</Text>
                </View>
                <View style={s.allTimeDivider} />
                <View style={s.allTimeStat}>
                  <Text style={s.allTimeValue}>{data.allTimeTrips ?? 0}</Text>
                  <Text style={s.allTimeLabel}>Total Trips</Text>
                </View>
              </View>
            </View>

            {/* Daily breakdown */}
            {data.breakdown?.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Daily Breakdown</Text>
                {(data.breakdown as Array<{ date: string; earnings: number; trips: number }>)
                  .reverse()
                  .slice(0, 10)
                  .map((day) => (
                    <View key={day.date} style={s.dayRow}>
                      <Text style={s.dayDate}>{new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                      <Text style={s.dayTrips}>{day.trips} trips</Text>
                      <Text style={s.dayEarnings}>£{day.earnings.toFixed(2)}</Text>
                    </View>
                  ))
                }
              </View>
            )}

            {/* Recent Trips */}
            {data.recentBookings?.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Recent Trips</Text>
                {(data.recentBookings as Array<{ id: string; pickupAddress: string; dropoffAddress: string; actualFare: number; completedAt: string }>).map((trip) => (
                  <View key={trip.id} style={s.tripRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.tripPickup} numberOfLines={1}>{trip.pickupAddress}</Text>
                      <Text style={s.tripDropoff} numberOfLines={1}>→ {trip.dropoffAddress}</Text>
                      <Text style={s.tripDate}>{new Date(trip.completedAt).toLocaleString()}</Text>
                    </View>
                    <Text style={s.tripFare}>£{trip.actualFare?.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={s.empty}>
            <Ionicons name="wallet-outline" size={48} color={Colors.border} />
            <Text style={s.emptyText}>No earnings data yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text, padding: Spacing.xl, paddingBottom: Spacing.md },
  periodRow: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md, backgroundColor: Colors.surface2, borderRadius: Radius.lg, padding: 4, gap: 4 },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.md },
  periodBtnActive: { backgroundColor: Colors.white, ...Shadow.sm },
  periodText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  periodTextActive: { color: Colors.text },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', margin: Spacing.lg, gap: 10 },
  summaryCard: { width: '47%', padding: Spacing.lg, borderRadius: Radius.xl, backgroundColor: Colors.white, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  summaryValue: { fontSize: 22, fontWeight: '800', color: Colors.white, marginTop: 4 },
  summaryLabel: { fontSize: 12, color: Colors.white + 'bb' },
  allTimeCard: { margin: Spacing.lg, marginTop: 0, padding: Spacing.lg, backgroundColor: Colors.dark, borderRadius: Radius.xl, ...Shadow.md },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md },
  allTimeRow: { flexDirection: 'row', alignItems: 'center' },
  allTimeStat: { flex: 1, alignItems: 'center' },
  allTimeValue: { fontSize: 24, fontWeight: '800', color: Colors.white },
  allTimeLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  allTimeDivider: { width: 1, height: 40, backgroundColor: '#334155' },
  section: { margin: Spacing.lg, marginTop: 0, backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: Colors.border },
  dayDate: { flex: 1, fontSize: 13, color: Colors.text, fontWeight: '500' },
  dayTrips: { fontSize: 12, color: Colors.textMuted, marginRight: Spacing.md },
  dayEarnings: { fontSize: 14, fontWeight: '700', color: Colors.brand },
  tripRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: Colors.border, gap: 10 },
  tripPickup: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  tripDropoff: { fontSize: 12, color: Colors.textMuted },
  tripDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  tripFare: { fontSize: 16, fontWeight: '800', color: Colors.brand },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 14, color: Colors.textMuted },
});
