"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DriverProfileScreen;
// src/screens/profile/DriverProfileScreen.tsx
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const react_query_1 = require("@tanstack/react-query");
const stores_1 = require("../../store/stores");
const api_1 = __importDefault(require("../../lib/api"));
const theme_1 = require("../../constants/theme");
const DOC_TYPES = [
    { key: 'DRIVING_LICENSE', label: 'Driving Licence', icon: 'card-outline', required: true },
    { key: 'INSURANCE', label: 'Insurance Certificate', icon: 'shield-outline', required: true },
    { key: 'DBS_CHECK', label: 'DBS Check', icon: 'shield-checkmark-outline', required: true },
    { key: 'VEHICLE_REGISTRATION', label: 'Vehicle Registration', icon: 'document-text-outline', required: true },
    { key: 'MOT_CERTIFICATE', label: 'MOT Certificate', icon: 'checkmark-circle-outline', required: true },
    { key: 'PROFILE_PHOTO', label: 'Profile Photo', icon: 'person-circle-outline', required: true },
    { key: 'VEHICLE_PHOTO', label: 'Vehicle Photo', icon: 'car-outline', required: false },
];
function DriverProfileScreen() {
    const { user, clearAuth } = (0, stores_1.useAuthStore)();
    const qc = (0, react_query_1.useQueryClient)();
    const { data: profile, isLoading } = (0, react_query_1.useQuery)({
        queryKey: ['driver-profile'],
        queryFn: () => api_1.default.get('/drivers/me').then(r => r.data.data),
    });
    const handleLogout = () => {
        react_native_1.Alert.alert('Log Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: async () => clearAuth() },
        ]);
    };
    const statusConfig = (status) => {
        const map = {
            APPROVED: { color: theme_1.Colors.success, bg: '#dcfce7', label: 'Approved ✓' },
            PENDING_APPROVAL: { color: theme_1.Colors.warning, bg: '#fef9c3', label: 'Pending Review' },
            REJECTED: { color: theme_1.Colors.danger, bg: '#fee2e2', label: 'Rejected' },
            SUSPENDED: { color: theme_1.Colors.danger, bg: '#fee2e2', label: 'Suspended' },
        };
        return map[status] ?? { color: theme_1.Colors.textMuted, bg: theme_1.Colors.surface2, label: status };
    };
    const docStatus = (docType) => {
        const doc = profile?.documents?.find((d) => d.type === docType);
        return { status: doc?.status ?? 'NOT_UPLOADED', uploaded: !!doc };
    };
    const docStatusColor = (status) => {
        if (status === 'APPROVED')
            return theme_1.Colors.success;
        if (status === 'REJECTED')
            return theme_1.Colors.danger;
        if (status === 'PENDING')
            return theme_1.Colors.warning;
        return theme_1.Colors.textMuted;
    };
    if (isLoading) {
        return <react_native_1.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><react_native_1.ActivityIndicator color={theme_1.Colors.brand}/></react_native_1.View>;
    }
    const sc = profile ? statusConfig(profile.status) : null;
    return (<react_native_safe_area_context_1.SafeAreaView style={s.container} edges={['top']}>
      <react_native_1.ScrollView showsVerticalScrollIndicator={false}>
        <react_native_1.Text style={s.title}>Profile</react_native_1.Text>

        {/* Profile Card */}
        <react_native_1.View style={s.profileCard}>
          <react_native_1.View style={s.avatar}>
            <react_native_1.Text style={s.avatarText}>{user?.firstName?.[0]}{user?.lastName?.[0]}</react_native_1.Text>
          </react_native_1.View>
          <react_native_1.View style={{ flex: 1 }}>
            <react_native_1.Text style={s.name}>{user?.firstName} {user?.lastName}</react_native_1.Text>
            <react_native_1.Text style={s.phone}>{user?.phone}</react_native_1.Text>
            {sc && (<react_native_1.View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                <react_native_1.Text style={[s.statusText, { color: sc.color }]}>{sc.label}</react_native_1.Text>
              </react_native_1.View>)}
          </react_native_1.View>
        </react_native_1.View>

        {/* Driver Stats */}
        {profile && (<react_native_1.View style={s.statsCard}>
            {[
                { label: 'Rating', value: `★ ${profile.rating?.toFixed(1) ?? '—'}` },
                { label: 'Total Trips', value: profile.totalTrips ?? 0 },
                { label: 'All-Time Earnings', value: `£${profile.totalEarnings?.toFixed(2) ?? '0.00'}` },
                { label: 'License #', value: profile.licenseNumber ?? '—' },
            ].map(({ label, value }) => (<react_native_1.View key={label} style={s.statRow}>
                <react_native_1.Text style={s.statLabel}>{label}</react_native_1.Text>
                <react_native_1.Text style={s.statValue}>{value}</react_native_1.Text>
              </react_native_1.View>))}
          </react_native_1.View>)}

        {/* Vehicles */}
        {profile?.vehicles?.length > 0 && (<react_native_1.View style={s.section}>
            <react_native_1.Text style={s.sectionTitle}>My Vehicle</react_native_1.Text>
            {profile.vehicles.map((v) => (<react_native_1.View key={v.id} style={s.vehicleRow}>
                <vector_icons_1.Ionicons name="car" size={20} color={theme_1.Colors.brand}/>
                <react_native_1.View style={{ flex: 1 }}>
                  <react_native_1.Text style={s.vehicleName}>{v.make} {v.model} ({v.year})</react_native_1.Text>
                  <react_native_1.Text style={s.vehicleSub}>{v.color} · {v.vehicleType} · <react_native_1.Text style={{ fontFamily: 'monospace' }}>{v.licensePlate}</react_native_1.Text></react_native_1.Text>
                </react_native_1.View>
              </react_native_1.View>))}
          </react_native_1.View>)}

        {/* Documents */}
        <react_native_1.View style={s.section}>
          <react_native_1.Text style={s.sectionTitle}>Documents</react_native_1.Text>
          <react_native_1.Text style={s.sectionSubtitle}>Upload all required documents to get approved</react_native_1.Text>
          {DOC_TYPES.map(({ key, label, icon, required }) => {
            const { status, uploaded } = docStatus(key);
            return (<react_native_1.TouchableOpacity key={key} style={s.docRow} activeOpacity={0.7} onPress={() => react_native_1.Alert.alert('Upload Document', `Upload your ${label} via the admin panel or contact support.`)}>
                <react_native_1.View style={s.docIcon}>
                  <vector_icons_1.Ionicons name={icon} size={18} color={theme_1.Colors.textSecondary}/>
                </react_native_1.View>
                <react_native_1.View style={{ flex: 1 }}>
                  <react_native_1.Text style={s.docLabel}>{label}{required && <react_native_1.Text style={{ color: theme_1.Colors.danger }}> *</react_native_1.Text>}</react_native_1.Text>
                  <react_native_1.Text style={[s.docStatus, { color: docStatusColor(status) }]}>
                    {status === 'NOT_UPLOADED' ? 'Not uploaded' : status}
                  </react_native_1.Text>
                </react_native_1.View>
                <vector_icons_1.Ionicons name={uploaded ? 'checkmark-circle' : 'cloud-upload-outline'} size={20} color={uploaded ? docStatusColor(status) : theme_1.Colors.textMuted}/>
              </react_native_1.TouchableOpacity>);
        })}
        </react_native_1.View>

        {/* Menu */}
        <react_native_1.View style={s.section}>
          {[
            { icon: 'help-circle-outline', label: 'Help & Support' },
            { icon: 'document-text-outline', label: 'Terms & Conditions' },
            { icon: 'information-circle-outline', label: 'App Version 1.0.0' },
        ].map(({ icon, label }) => (<react_native_1.TouchableOpacity key={label} style={s.menuRow}>
              <vector_icons_1.Ionicons name={icon} size={18} color={theme_1.Colors.textSecondary}/>
              <react_native_1.Text style={s.menuLabel}>{label}</react_native_1.Text>
              <vector_icons_1.Ionicons name="chevron-forward" size={16} color={theme_1.Colors.textMuted}/>
            </react_native_1.TouchableOpacity>))}
        </react_native_1.View>

        <react_native_1.TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <vector_icons_1.Ionicons name="log-out-outline" size={18} color={theme_1.Colors.danger}/>
          <react_native_1.Text style={s.logoutText}>Log Out</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.ScrollView>
    </react_native_safe_area_context_1.SafeAreaView>);
}
const s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.surface },
    title: { fontSize: 24, fontWeight: '700', color: theme_1.Colors.text, padding: theme_1.Spacing.xl, paddingBottom: theme_1.Spacing.md },
    profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, margin: theme_1.Spacing.lg, padding: theme_1.Spacing.lg, backgroundColor: theme_1.Colors.white, borderRadius: theme_1.Radius.xl, ...theme_1.Shadow.sm, borderWidth: 1, borderColor: theme_1.Colors.border },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: theme_1.Colors.brand, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 22, fontWeight: '800', color: theme_1.Colors.white },
    name: { fontSize: 17, fontWeight: '700', color: theme_1.Colors.text },
    phone: { fontSize: 13, color: theme_1.Colors.textMuted, marginTop: 2 },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme_1.Radius.full, marginTop: 6 },
    statusText: { fontSize: 11, fontWeight: '700' },
    statsCard: { margin: theme_1.Spacing.lg, marginTop: 0, padding: theme_1.Spacing.lg, backgroundColor: theme_1.Colors.dark, borderRadius: theme_1.Radius.xl, ...theme_1.Shadow.md },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#1e293b' },
    statLabel: { fontSize: 13, color: '#94a3b8' },
    statValue: { fontSize: 13, fontWeight: '700', color: theme_1.Colors.white },
    section: { margin: theme_1.Spacing.lg, marginTop: 0, backgroundColor: theme_1.Colors.white, borderRadius: theme_1.Radius.xl, padding: theme_1.Spacing.lg, ...theme_1.Shadow.sm, borderWidth: 1, borderColor: theme_1.Colors.border },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: theme_1.Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    sectionSubtitle: { fontSize: 12, color: theme_1.Colors.textMuted, marginBottom: theme_1.Spacing.md },
    vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    vehicleName: { fontSize: 14, fontWeight: '600', color: theme_1.Colors.text },
    vehicleSub: { fontSize: 12, color: theme_1.Colors.textMuted, marginTop: 2 },
    docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderColor: theme_1.Colors.border },
    docIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme_1.Colors.surface2, alignItems: 'center', justifyContent: 'center' },
    docLabel: { fontSize: 14, color: theme_1.Colors.text, fontWeight: '500' },
    docStatus: { fontSize: 11, fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },
    menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderColor: theme_1.Colors.border },
    menuLabel: { flex: 1, fontSize: 14, color: theme_1.Colors.text },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: theme_1.Spacing.lg, padding: theme_1.Spacing.lg, backgroundColor: '#fef2f2', borderRadius: theme_1.Radius.xl, borderWidth: 1, borderColor: '#fecaca' },
    logoutText: { fontSize: 15, fontWeight: '600', color: theme_1.Colors.danger },
});
//# sourceMappingURL=DriverProfileScreen.js.map