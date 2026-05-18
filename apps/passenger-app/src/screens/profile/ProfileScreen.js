"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProfileScreen;
// src/screens/profile/ProfileScreen.tsx
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const react_query_1 = require("@tanstack/react-query");
const authStore_1 = require("../../store/authStore");
const api_1 = __importDefault(require("../../lib/api"));
const theme_1 = require("../../constants/theme");
function ProfileScreen() {
    const { user, clearAuth } = (0, authStore_1.useAuthStore)();
    const qc = (0, react_query_1.useQueryClient)();
    const { data: profile, isLoading } = (0, react_query_1.useQuery)({
        queryKey: ['passenger-profile'],
        queryFn: () => api_1.default.get('/passengers/me').then(r => r.data.data),
    });
    const handleLogout = () => {
        react_native_1.Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: async () => { await clearAuth(); } },
        ]);
    };
    const MENU_ITEMS = [
        { icon: 'location-outline', label: 'Saved Addresses', onPress: () => { } },
        { icon: 'card-outline', label: 'Payment Methods', onPress: () => { } },
        { icon: 'notifications-outline', label: 'Notifications', onPress: () => { } },
        { icon: 'shield-checkmark-outline', label: 'Privacy & Security', onPress: () => { } },
        { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => { } },
        { icon: 'document-text-outline', label: 'Terms & Privacy Policy', onPress: () => { } },
    ];
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container} edges={['top']}>
      <react_native_1.ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <react_native_1.Text style={styles.title}>Profile</react_native_1.Text>

        {/* Avatar + Info */}
        <react_native_1.View style={styles.profileCard}>
          <react_native_1.View style={styles.avatar}>
            <react_native_1.Text style={styles.avatarText}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </react_native_1.Text>
          </react_native_1.View>
          <react_native_1.View style={{ flex: 1 }}>
            <react_native_1.Text style={styles.name}>{user?.firstName} {user?.lastName}</react_native_1.Text>
            <react_native_1.Text style={styles.phone}>{user?.phone}</react_native_1.Text>
            {profile && (<react_native_1.View style={styles.statsRow}>
                <react_native_1.View style={styles.stat}>
                  <react_native_1.Text style={styles.statValue}>{profile._count?.bookings ?? 0}</react_native_1.Text>
                  <react_native_1.Text style={styles.statLabel}>Rides</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.View style={styles.statDivider}/>
                <react_native_1.View style={styles.stat}>
                  <vector_icons_1.Ionicons name="star" size={12} color={theme_1.Colors.brand}/>
                  <react_native_1.Text style={styles.statValue}>{profile.rating?.toFixed(1) ?? '—'}</react_native_1.Text>
                  <react_native_1.Text style={styles.statLabel}>Rating</react_native_1.Text>
                </react_native_1.View>
              </react_native_1.View>)}
          </react_native_1.View>
          <react_native_1.TouchableOpacity style={styles.editBtn}>
            <vector_icons_1.Ionicons name="pencil" size={16} color={theme_1.Colors.brand}/>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>

        {/* Saved Addresses */}
        {profile?.savedAddresses?.length > 0 && (<react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.sectionTitle}>Saved Places</react_native_1.Text>
            {profile.savedAddresses.map((addr) => (<react_native_1.View key={addr.id} style={styles.addressRow}>
                <react_native_1.View style={styles.addressIcon}>
                  <vector_icons_1.Ionicons name={addr.label.toLowerCase() === 'home' ? 'home' : addr.label.toLowerCase() === 'work' ? 'briefcase' : 'location'} size={16} color={theme_1.Colors.brand}/>
                </react_native_1.View>
                <react_native_1.View style={{ flex: 1 }}>
                  <react_native_1.Text style={styles.addressLabel}>{addr.label}</react_native_1.Text>
                  <react_native_1.Text style={styles.addressText} numberOfLines={1}>{addr.fullAddress}</react_native_1.Text>
                </react_native_1.View>
                <vector_icons_1.Ionicons name="chevron-forward" size={16} color={theme_1.Colors.textMuted}/>
              </react_native_1.View>))}
          </react_native_1.View>)}

        {/* Menu */}
        <react_native_1.View style={styles.section}>
          {MENU_ITEMS.map(({ icon, label, onPress }) => (<react_native_1.TouchableOpacity key={label} style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
              <react_native_1.View style={styles.menuIcon}>
                <vector_icons_1.Ionicons name={icon} size={18} color={theme_1.Colors.textSecondary}/>
              </react_native_1.View>
              <react_native_1.Text style={styles.menuLabel}>{label}</react_native_1.Text>
              <vector_icons_1.Ionicons name="chevron-forward" size={16} color={theme_1.Colors.textMuted}/>
            </react_native_1.TouchableOpacity>))}
        </react_native_1.View>

        {/* Logout */}
        <react_native_1.TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <vector_icons_1.Ionicons name="log-out-outline" size={18} color={theme_1.Colors.danger}/>
          <react_native_1.Text style={styles.logoutText}>Log Out</react_native_1.Text>
        </react_native_1.TouchableOpacity>

        <react_native_1.Text style={styles.version}>TaxiFlow v1.0.0</react_native_1.Text>
      </react_native_1.ScrollView>
    </react_native_safe_area_context_1.SafeAreaView>);
}
const styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.surface },
    title: { fontSize: 24, fontWeight: '700', color: theme_1.Colors.text, padding: theme_1.Spacing.xl, paddingBottom: theme_1.Spacing.md },
    profileCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        margin: theme_1.Spacing.lg, padding: theme_1.Spacing.lg,
        backgroundColor: theme_1.Colors.white, borderRadius: theme_1.Radius.xl,
        ...theme_1.Shadow.sm, borderWidth: 1, borderColor: theme_1.Colors.border,
    },
    avatar: {
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: theme_1.Colors.brand, alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 22, fontWeight: '800', color: theme_1.Colors.white },
    name: { fontSize: 17, fontWeight: '700', color: theme_1.Colors.text },
    phone: { fontSize: 13, color: theme_1.Colors.textMuted, marginTop: 2 },
    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    statValue: { fontSize: 13, fontWeight: '700', color: theme_1.Colors.text },
    statLabel: { fontSize: 11, color: theme_1.Colors.textMuted },
    statDivider: { width: 1, height: 12, backgroundColor: theme_1.Colors.border },
    editBtn: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: theme_1.Colors.brandLight, alignItems: 'center', justifyContent: 'center',
    },
    section: {
        margin: theme_1.Spacing.lg, marginTop: 0, backgroundColor: theme_1.Colors.white,
        borderRadius: theme_1.Radius.xl, ...theme_1.Shadow.sm, borderWidth: 1, borderColor: theme_1.Colors.border, overflow: 'hidden',
    },
    sectionTitle: { fontSize: 13, fontWeight: '600', color: theme_1.Colors.textMuted, padding: theme_1.Spacing.lg, paddingBottom: theme_1.Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: theme_1.Spacing.md, paddingHorizontal: theme_1.Spacing.lg, borderTopWidth: 1, borderColor: theme_1.Colors.border },
    addressIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme_1.Colors.brandLight, alignItems: 'center', justifyContent: 'center' },
    addressLabel: { fontSize: 13, fontWeight: '600', color: theme_1.Colors.text },
    addressText: { fontSize: 12, color: theme_1.Colors.textMuted, marginTop: 1 },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: theme_1.Spacing.md, paddingHorizontal: theme_1.Spacing.lg, borderTopWidth: 1, borderColor: theme_1.Colors.border },
    menuIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme_1.Colors.surface2, alignItems: 'center', justifyContent: 'center' },
    menuLabel: { flex: 1, fontSize: 15, color: theme_1.Colors.text },
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        margin: theme_1.Spacing.lg, marginTop: 0, padding: theme_1.Spacing.lg,
        backgroundColor: '#fef2f2', borderRadius: theme_1.Radius.xl, borderWidth: 1, borderColor: '#fecaca',
    },
    logoutText: { fontSize: 15, fontWeight: '600', color: theme_1.Colors.danger },
    version: { textAlign: 'center', fontSize: 11, color: theme_1.Colors.textMuted, marginBottom: theme_1.Spacing.xxxl },
});
//# sourceMappingURL=ProfileScreen.js.map