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
exports.default = LoginScreen;
// src/screens/auth/LoginScreen.tsx
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const authStore_1 = require("../../store/authStore");
const api_1 = __importDefault(require("../../lib/api"));
const theme_1 = require("../../constants/theme");
const TENANT_ID = process.env.EXPO_PUBLIC_TENANT_ID ?? '';
function LoginScreen() {
    const [step, setStep] = (0, react_1.useState)('phone');
    const [phone, setPhone] = (0, react_1.useState)('');
    const [otp, setOtp] = (0, react_1.useState)(['', '', '', '', '', '']);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const otpRefs = (0, react_1.useRef)([]);
    const { setAuth } = (0, authStore_1.useAuthStore)();
    const handleSendOtp = async () => {
        if (phone.trim().length < 7) {
            react_native_1.Alert.alert('Invalid number', 'Please enter a valid phone number');
            return;
        }
        setLoading(true);
        try {
            await api_1.default.post('/auth/send-otp', { phone: phone.trim() }, {
                headers: { 'x-tenant-id': TENANT_ID },
            });
            setStep('otp');
        }
        catch {
            react_native_1.Alert.alert('Error', 'Failed to send OTP. Please check your number and try again.');
        }
        finally {
            setLoading(false);
        }
    };
    const handleVerifyOtp = async () => {
        const code = otp.join('');
        if (code.length < 6) {
            react_native_1.Alert.alert('Enter OTP', 'Please enter the 6-digit code');
            return;
        }
        setLoading(true);
        try {
            const res = await api_1.default.post('/auth/verify-otp', { phone: phone.trim(), code }, {
                headers: { 'x-tenant-id': TENANT_ID },
            });
            const { user, accessToken } = res.data.data;
            await setAuth(user, accessToken, TENANT_ID);
        }
        catch {
            react_native_1.Alert.alert('Invalid OTP', 'The code you entered is incorrect or expired.');
            setOtp(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
        }
        finally {
            setLoading(false);
        }
    };
    const handleOtpChange = (value, index) => {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
        if (!value && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
      <react_native_1.KeyboardAvoidingView behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <react_native_1.ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <react_native_1.View style={styles.header}>
            <react_native_1.View style={styles.logoBox}>
              <vector_icons_1.Ionicons name="car" size={28} color={theme_1.Colors.white}/>
            </react_native_1.View>
            <react_native_1.Text style={styles.appName}>CityRide</react_native_1.Text>
            <react_native_1.Text style={styles.tagline}>Your city, your ride</react_native_1.Text>
          </react_native_1.View>

          {/* Card */}
          <react_native_1.View style={styles.card}>
            {step === 'phone' ? (<>
                <react_native_1.Text style={styles.title}>Welcome back</react_native_1.Text>
                <react_native_1.Text style={styles.subtitle}>Enter your phone number to continue</react_native_1.Text>

                <react_native_1.View style={styles.inputWrapper}>
                  <vector_icons_1.Ionicons name="call-outline" size={18} color={theme_1.Colors.textMuted} style={styles.inputIcon}/>
                  <react_native_1.TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+44 7700 000000" placeholderTextColor={theme_1.Colors.textMuted} keyboardType="phone-pad" autoFocus returnKeyType="done" onSubmitEditing={handleSendOtp}/>
                </react_native_1.View>

                <react_native_1.TouchableOpacity style={styles.btnPrimary} onPress={handleSendOtp} disabled={loading} activeOpacity={0.85}>
                  {loading
                ? <react_native_1.ActivityIndicator color={theme_1.Colors.white}/>
                : <react_native_1.Text style={styles.btnPrimaryText}>Send OTP Code →</react_native_1.Text>}
                </react_native_1.TouchableOpacity>

                <react_native_1.Text style={styles.disclaimer}>
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </react_native_1.Text>
              </>) : (<>
                <react_native_1.TouchableOpacity onPress={() => setStep('phone')} style={styles.backBtn}>
                  <vector_icons_1.Ionicons name="arrow-back" size={20} color={theme_1.Colors.text}/>
                </react_native_1.TouchableOpacity>
                <react_native_1.Text style={styles.title}>Enter OTP</react_native_1.Text>
                <react_native_1.Text style={styles.subtitle}>
                  We sent a 6-digit code to{'\n'}
                  <react_native_1.Text style={styles.phoneHighlight}>{phone}</react_native_1.Text>
                </react_native_1.Text>

                <react_native_1.View style={styles.otpRow}>
                  {otp.map((digit, i) => (<react_native_1.TextInput key={i} ref={(ref) => { otpRefs.current[i] = ref; }} style={[styles.otpBox, digit ? styles.otpBoxFilled : null]} value={digit} onChangeText={(v) => handleOtpChange(v.replace(/\D/g, '').slice(-1), i)} keyboardType="number-pad" maxLength={1} textAlign="center" selectTextOnFocus/>))}
                </react_native_1.View>

                <react_native_1.TouchableOpacity style={styles.btnPrimary} onPress={handleVerifyOtp} disabled={loading || otp.join('').length < 6} activeOpacity={0.85}>
                  {loading
                ? <react_native_1.ActivityIndicator color={theme_1.Colors.white}/>
                : <react_native_1.Text style={styles.btnPrimaryText}>Verify & Continue</react_native_1.Text>}
                </react_native_1.TouchableOpacity>

                <react_native_1.TouchableOpacity onPress={handleSendOtp} style={styles.resendBtn}>
                  <react_native_1.Text style={styles.resendText}>Didn't receive it? <react_native_1.Text style={styles.resendLink}>Resend</react_native_1.Text></react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </>)}
          </react_native_1.View>
        </react_native_1.ScrollView>
      </react_native_1.KeyboardAvoidingView>
    </react_native_safe_area_context_1.SafeAreaView>);
}
const styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.dark },
    scroll: { flexGrow: 1, padding: theme_1.Spacing.xl },
    header: { alignItems: 'center', paddingVertical: theme_1.Spacing.xxxl },
    logoBox: {
        width: 64, height: 64, borderRadius: 18,
        backgroundColor: theme_1.Colors.brand, alignItems: 'center', justifyContent: 'center',
        marginBottom: theme_1.Spacing.md, ...theme_1.Shadow.lg,
    },
    appName: { fontSize: 28, fontWeight: '800', color: theme_1.Colors.white, letterSpacing: -0.5 },
    tagline: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
    card: {
        backgroundColor: theme_1.Colors.white, borderRadius: 24,
        padding: theme_1.Spacing.xl, ...theme_1.Shadow.lg,
    },
    backBtn: { marginBottom: theme_1.Spacing.md, alignSelf: 'flex-start', padding: 4 },
    title: { fontSize: 22, fontWeight: '700', color: theme_1.Colors.text, marginBottom: 6 },
    subtitle: { fontSize: 14, color: theme_1.Colors.textMuted, marginBottom: theme_1.Spacing.xl, lineHeight: 20 },
    phoneHighlight: { color: theme_1.Colors.brand, fontWeight: '600' },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg,
        borderWidth: 1.5, borderColor: theme_1.Colors.border,
        marginBottom: theme_1.Spacing.lg, paddingHorizontal: theme_1.Spacing.md,
    },
    inputIcon: { marginRight: 8 },
    input: { flex: 1, fontSize: 16, color: theme_1.Colors.text, paddingVertical: 14 },
    btnPrimary: {
        backgroundColor: theme_1.Colors.brand, borderRadius: theme_1.Radius.lg,
        paddingVertical: 15, alignItems: 'center',
        ...theme_1.Shadow.sm,
    },
    btnPrimaryText: { color: theme_1.Colors.white, fontSize: 16, fontWeight: '700' },
    disclaimer: { fontSize: 11, color: theme_1.Colors.textMuted, textAlign: 'center', marginTop: theme_1.Spacing.md, lineHeight: 16 },
    otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme_1.Spacing.xl, gap: 8 },
    otpBox: {
        width: 46, height: 56, borderRadius: theme_1.Radius.md,
        backgroundColor: theme_1.Colors.surface, borderWidth: 1.5, borderColor: theme_1.Colors.border,
        fontSize: 22, fontWeight: '700', color: theme_1.Colors.text,
    },
    otpBoxFilled: { borderColor: theme_1.Colors.brand, backgroundColor: theme_1.Colors.brandLight },
    resendBtn: { alignItems: 'center', marginTop: theme_1.Spacing.lg, paddingVertical: 8 },
    resendText: { fontSize: 13, color: theme_1.Colors.textMuted },
    resendLink: { color: theme_1.Colors.brand, fontWeight: '600' },
});
//# sourceMappingURL=LoginScreen.js.map