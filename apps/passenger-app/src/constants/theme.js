"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalStyles = exports.Shadow = exports.Typography = exports.Radius = exports.Spacing = exports.Colors = void 0;
// src/constants/theme.ts
const react_native_1 = require("react-native");
exports.Colors = {
    brand: '#f59e0b',
    brandDark: '#d97706',
    brandLight: '#fef3c7',
    background: '#ffffff',
    surface: '#f9fafb',
    surface2: '#f3f4f6',
    border: '#e5e7eb',
    text: '#111827',
    textSecondary: '#374151',
    textMuted: '#9ca3af',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    dark: '#0f172a',
    darkCard: '#1e293b',
    white: '#ffffff',
    black: '#000000',
    overlay: 'rgba(0,0,0,0.5)',
    mapPickup: '#10b981',
    mapDropoff: '#ef4444',
    mapDriver: '#f59e0b',
};
exports.Spacing = {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
};
exports.Radius = {
    sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 999,
};
exports.Typography = {
    xs: { fontSize: 11, lineHeight: 16 },
    sm: { fontSize: 13, lineHeight: 18 },
    base: { fontSize: 15, lineHeight: 22 },
    md: { fontSize: 17, lineHeight: 24 },
    lg: { fontSize: 20, lineHeight: 28 },
    xl: { fontSize: 24, lineHeight: 32 },
    xxl: { fontSize: 30, lineHeight: 38 },
};
exports.Shadow = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 8,
    },
};
exports.GlobalStyles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: exports.Colors.background },
    safeArea: { flex: 1, backgroundColor: exports.Colors.background },
    row: { flexDirection: 'row', alignItems: 'center' },
    center: { alignItems: 'center', justifyContent: 'center' },
    card: {
        backgroundColor: exports.Colors.white,
        borderRadius: exports.Radius.xl,
        padding: exports.Spacing.lg,
        borderWidth: 1,
        borderColor: exports.Colors.border,
        ...exports.Shadow.sm,
    },
    input: {
        backgroundColor: exports.Colors.surface,
        borderRadius: exports.Radius.lg,
        paddingHorizontal: exports.Spacing.lg,
        paddingVertical: exports.Spacing.md,
        fontSize: 15,
        color: exports.Colors.text,
        borderWidth: 1,
        borderColor: exports.Colors.border,
    },
    inputFocused: { borderColor: exports.Colors.brand, borderWidth: 2 },
    btnPrimary: {
        backgroundColor: exports.Colors.brand,
        borderRadius: exports.Radius.lg,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    btnSecondary: {
        backgroundColor: exports.Colors.surface2,
        borderRadius: exports.Radius.lg,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnText: { color: exports.Colors.white, fontSize: 16, fontWeight: '700' },
    btnSecondaryText: { color: exports.Colors.textSecondary, fontSize: 16, fontWeight: '600' },
    heading: { fontSize: 24, fontWeight: '700', color: exports.Colors.text },
    subheading: { fontSize: 16, color: exports.Colors.textMuted },
    label: { fontSize: 12, color: exports.Colors.textMuted, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: exports.Radius.full },
    badgeText: { fontSize: 11, fontWeight: '600' },
});
//# sourceMappingURL=theme.js.map