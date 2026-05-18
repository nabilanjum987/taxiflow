// src/screens/profile/ProfileScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { Colors, Spacing, Radius, Shadow } from '../../constants/theme';

export default function ProfileScreen(): React.JSX.Element {
  const { user, clearAuth } = useAuthStore();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['passenger-profile'],
    queryFn: () => api.get('/passengers/me').then(r => r.data.data),
  });

  const handleLogout = (): void => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => { await clearAuth(); } },
    ]);
  };

  const MENU_ITEMS = [
    { icon: 'location-outline', label: 'Saved Addresses', onPress: () => {} },
    { icon: 'card-outline', label: 'Payment Methods', onPress: () => {} },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => {} },
    { icon: 'shield-checkmark-outline', label: 'Privacy & Security', onPress: () => {} },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => {} },
    { icon: 'document-text-outline', label: 'Terms & Privacy Policy', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={styles.title}>Profile</Text>

        {/* Avatar + Info */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.phone}>{user?.phone}</Text>
            {profile && (
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{profile._count?.bookings ?? 0}</Text>
                  <Text style={styles.statLabel}>Rides</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Ionicons name="star" size={12} color={Colors.brand} />
                  <Text style={styles.statValue}>{profile.rating?.toFixed(1) ?? '—'}</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <Ionicons name="pencil" size={16} color={Colors.brand} />
          </TouchableOpacity>
        </View>

        {/* Saved Addresses */}
        {profile?.savedAddresses?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saved Places</Text>
            {profile.savedAddresses.map((addr: { id: string; label: string; fullAddress: string }) => (
              <View key={addr.id} style={styles.addressRow}>
                <View style={styles.addressIcon}>
                  <Ionicons
                    name={addr.label.toLowerCase() === 'home' ? 'home' : addr.label.toLowerCase() === 'work' ? 'briefcase' : 'location'}
                    size={16}
                    color={Colors.brand}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressLabel}>{addr.label}</Text>
                  <Text style={styles.addressText} numberOfLines={1}>{addr.fullAddress}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </View>
            ))}
          </View>
        )}

        {/* Menu */}
        <View style={styles.section}>
          {MENU_ITEMS.map(({ icon, label, onPress }) => (
            <TouchableOpacity key={label} style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
              <View style={styles.menuIcon}>
                <Ionicons name={icon as 'home'} size={18} color={Colors.textSecondary} />
              </View>
              <Text style={styles.menuLabel}>{label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>TaxiFlow v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text, padding: Spacing.xl, paddingBottom: Spacing.md },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    margin: Spacing.lg, padding: Spacing.lg,
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    ...Shadow.sm, borderWidth: 1, borderColor: Colors.border,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.brand, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '800', color: Colors.white },
  name: { fontSize: 17, fontWeight: '700', color: Colors.text },
  phone: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statValue: { fontSize: 13, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textMuted },
  statDivider: { width: 1, height: 12, backgroundColor: Colors.border },
  editBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.brandLight, alignItems: 'center', justifyContent: 'center',
  },
  section: {
    margin: Spacing.lg, marginTop: 0, backgroundColor: Colors.white,
    borderRadius: Radius.xl, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, padding: Spacing.lg, paddingBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md, paddingHorizontal: Spacing.lg, borderTopWidth: 1, borderColor: Colors.border },
  addressIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.brandLight, alignItems: 'center', justifyContent: 'center' },
  addressLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  addressText: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md, paddingHorizontal: Spacing.lg, borderTopWidth: 1, borderColor: Colors.border },
  menuIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, color: Colors.text },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    margin: Spacing.lg, marginTop: 0, padding: Spacing.lg,
    backgroundColor: '#fef2f2', borderRadius: Radius.xl, borderWidth: 1, borderColor: '#fecaca',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.danger },
  version: { textAlign: 'center', fontSize: 11, color: Colors.textMuted, marginBottom: Spacing.xxxl },
});
