// src/screens/profile/DriverProfileScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/stores';
import api from '../../lib/api';
import { Colors, Spacing, Radius, Shadow } from '../../constants/theme';

const DOC_TYPES = [
  { key: 'DRIVING_LICENSE', label: 'Driving Licence', icon: 'card-outline', required: true },
  { key: 'INSURANCE', label: 'Insurance Certificate', icon: 'shield-outline', required: true },
  { key: 'DBS_CHECK', label: 'DBS Check', icon: 'shield-checkmark-outline', required: true },
  { key: 'VEHICLE_REGISTRATION', label: 'Vehicle Registration', icon: 'document-text-outline', required: true },
  { key: 'MOT_CERTIFICATE', label: 'MOT Certificate', icon: 'checkmark-circle-outline', required: true },
  { key: 'PROFILE_PHOTO', label: 'Profile Photo', icon: 'person-circle-outline', required: true },
  { key: 'VEHICLE_PHOTO', label: 'Vehicle Photo', icon: 'car-outline', required: false },
];

export default function DriverProfileScreen(): React.JSX.Element {
  const { user, clearAuth } = useAuthStore();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['driver-profile'],
    queryFn: () => api.get('/drivers/me').then(r => r.data.data),
  });

  const handleLogout = (): void => {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => clearAuth() },
    ]);
  };

  const statusConfig = (status: string): { color: string; bg: string; label: string } => {
    const map: Record<string, { color: string; bg: string; label: string }> = {
      APPROVED: { color: Colors.success, bg: '#dcfce7', label: 'Approved ✓' },
      PENDING_APPROVAL: { color: Colors.warning, bg: '#fef9c3', label: 'Pending Review' },
      REJECTED: { color: Colors.danger, bg: '#fee2e2', label: 'Rejected' },
      SUSPENDED: { color: Colors.danger, bg: '#fee2e2', label: 'Suspended' },
    };
    return map[status] ?? { color: Colors.textMuted, bg: Colors.surface2, label: status };
  };

  const docStatus = (docType: string): { status: string; uploaded: boolean } => {
    const doc = profile?.documents?.find((d: { type: string }) => d.type === docType);
    return { status: doc?.status ?? 'NOT_UPLOADED', uploaded: !!doc };
  };

  const docStatusColor = (status: string): string => {
    if (status === 'APPROVED') return Colors.success;
    if (status === 'REJECTED') return Colors.danger;
    if (status === 'PENDING') return Colors.warning;
    return Colors.textMuted;
  };

  if (isLoading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={Colors.brand} /></View>;
  }

  const sc = profile ? statusConfig(profile.status) : null;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Profile</Text>

        {/* Profile Card */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{user?.firstName} {user?.lastName}</Text>
            <Text style={s.phone}>{user?.phone}</Text>
            {sc && (
              <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                <Text style={[s.statusText, { color: sc.color }]}>{sc.label}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Driver Stats */}
        {profile && (
          <View style={s.statsCard}>
            {[
              { label: 'Rating', value: `★ ${profile.rating?.toFixed(1) ?? '—'}` },
              { label: 'Total Trips', value: profile.totalTrips ?? 0 },
              { label: 'All-Time Earnings', value: `£${profile.totalEarnings?.toFixed(2) ?? '0.00'}` },
              { label: 'License #', value: profile.licenseNumber ?? '—' },
            ].map(({ label, value }) => (
              <View key={label} style={s.statRow}>
                <Text style={s.statLabel}>{label}</Text>
                <Text style={s.statValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Vehicles */}
        {profile?.vehicles?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>My Vehicle</Text>
            {profile.vehicles.map((v: { id: string; make: string; model: string; year: number; color: string; licensePlate: string; vehicleType: string }) => (
              <View key={v.id} style={s.vehicleRow}>
                <Ionicons name="car" size={20} color={Colors.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={s.vehicleName}>{v.make} {v.model} ({v.year})</Text>
                  <Text style={s.vehicleSub}>{v.color} · {v.vehicleType} · <Text style={{ fontFamily: 'monospace' }}>{v.licensePlate}</Text></Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Documents */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Documents</Text>
          <Text style={s.sectionSubtitle}>Upload all required documents to get approved</Text>
          {DOC_TYPES.map(({ key, label, icon, required }) => {
            const { status, uploaded } = docStatus(key);
            return (
              <TouchableOpacity key={key} style={s.docRow} activeOpacity={0.7}
                onPress={() => Alert.alert('Upload Document', `Upload your ${label} via the admin panel or contact support.`)}>
                <View style={s.docIcon}>
                  <Ionicons name={icon as 'card-outline'} size={18} color={Colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.docLabel}>{label}{required && <Text style={{ color: Colors.danger }}> *</Text>}</Text>
                  <Text style={[s.docStatus, { color: docStatusColor(status) }]}>
                    {status === 'NOT_UPLOADED' ? 'Not uploaded' : status}
                  </Text>
                </View>
                <Ionicons
                  name={uploaded ? 'checkmark-circle' : 'cloud-upload-outline'}
                  size={20}
                  color={uploaded ? docStatusColor(status) : Colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Menu */}
        <View style={s.section}>
          {[
            { icon: 'help-circle-outline', label: 'Help & Support' },
            { icon: 'document-text-outline', label: 'Terms & Conditions' },
            { icon: 'information-circle-outline', label: 'App Version 1.0.0' },
          ].map(({ icon, label }) => (
            <TouchableOpacity key={label} style={s.menuRow}>
              <Ionicons name={icon as 'home'} size={18} color={Colors.textSecondary} />
              <Text style={s.menuLabel}>{label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text style={s.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text, padding: Spacing.xl, paddingBottom: Spacing.md },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, margin: Spacing.lg, padding: Spacing.lg, backgroundColor: Colors.white, borderRadius: Radius.xl, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '800', color: Colors.white },
  name: { fontSize: 17, fontWeight: '700', color: Colors.text },
  phone: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, marginTop: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  statsCard: { margin: Spacing.lg, marginTop: 0, padding: Spacing.lg, backgroundColor: Colors.dark, borderRadius: Radius.xl, ...Shadow.md },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#1e293b' },
  statLabel: { fontSize: 13, color: '#94a3b8' },
  statValue: { fontSize: 13, fontWeight: '700', color: Colors.white },
  section: { margin: Spacing.lg, marginTop: 0, backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, color: Colors.textMuted, marginBottom: Spacing.md },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  vehicleName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  vehicleSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderColor: Colors.border },
  docIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' },
  docLabel: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  docStatus: { fontSize: 11, fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderColor: Colors.border },
  menuLabel: { flex: 1, fontSize: 14, color: Colors.text },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: Spacing.lg, padding: Spacing.lg, backgroundColor: '#fef2f2', borderRadius: Radius.xl, borderWidth: 1, borderColor: '#fecaca' },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.danger },
});
