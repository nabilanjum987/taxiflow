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
exports.default = DriverLoginScreen;
// src/screens/auth/DriverLoginScreen.tsx
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const stores_1 = require("../../store/stores");
const api_1 = __importDefault(require("../../lib/api"));
const theme_1 = require("../../constants/theme");
const TENANT_ID = process.env.EXPO_PUBLIC_TENANT_ID ?? '';
function DriverLoginScreen() {
    const [step, setStep] = (0, react_1.useState)('phone');
    const [phone, setPhone] = (0, react_1.useState)('');
    const [otp, setOtp] = (0, react_1.useState)(['', '', '', '', '', '']);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const otpRefs = (0, react_1.useRef)([]);
    const { setAuth } = (0, stores_1.useAuthStore)();
    const handleSendOtp = async () => {
        if (phone.trim().length < 7) {
            react_native_1.Alert.alert('Invalid number', 'Please enter a valid phone number.');
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
            react_native_1.Alert.alert('Error', 'Failed to send OTP. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    const handleVerifyOtp = async () => {
        const code = otp.join('');
        if (code.length < 6)
            return;
        setLoading(true);
        try {
            const res = await api_1.default.post('/auth/verify-otp', { phone: phone.trim(), code }, {
                headers: { 'x-tenant-id': TENANT_ID },
            });
            const { user, accessToken } = res.data.data;
            if (user.role !== 'DRIVER') {
                react_native_1.Alert.alert('Wrong App', 'This app is for drivers only. Please use the passenger app.');
                return;
            }
            await setAuth(user, accessToken, TENANT_ID);
        }
        catch {
            react_native_1.Alert.alert('Invalid OTP', 'The code entered is incorrect or expired.');
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
        if (value && index < 5)
            otpRefs.current[index + 1]?.focus();
        if (!value && index > 0)
            otpRefs.current[index - 1]?.focus();
    };
    return (<react_native_safe_area_context_1.SafeAreaView style={s.container}>
      <react_native_1.KeyboardAvoidingView behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <react_native_1.ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <react_native_1.View style={s.header}>
            <react_native_1.View style={s.logoBox}>
              <vector_icons_1.Ionicons name="car-sport" size={30} color={theme_1.Colors.white}/>
            </react_native_1.View>
            <react_native_1.Text style={s.appName}>CityRide</react_native_1.Text>
            <react_native_1.Text style={s.appSub}>Driver Partner App</react_native_1.Text>
          </react_native_1.View>

          <react_native_1.View style={s.card}>
            {step === 'phone' ? (<>
                <react_native_1.Text style={s.title}>Driver Login</react_native_1.Text>
                <react_native_1.Text style={s.subtitle}>Enter your registered phone number</react_native_1.Text>
                <react_native_1.View style={s.inputWrapper}>
                  <vector_icons_1.Ionicons name="call-outline" size={18} color={theme_1.Colors.textMuted} style={{ marginRight: 8 }}/>
                  <react_native_1.TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="+44 7700 000000" placeholderTextColor={theme_1.Colors.textMuted} keyboardType="phone-pad" autoFocus onSubmitEditing={handleSendOtp}/>
                </react_native_1.View>
                <react_native_1.TouchableOpacity style={s.btn} onPress={handleSendOtp} disabled={loading} activeOpacity={0.85}>
                  {loading ? <react_native_1.ActivityIndicator color={theme_1.Colors.white}/> : <react_native_1.Text style={s.btnText}>Send OTP →</react_native_1.Text>}
                </react_native_1.TouchableOpacity>
                <react_native_1.View style={s.infoBox}>
                  <vector_icons_1.Ionicons name="information-circle-outline" size={16} color={theme_1.Colors.info}/>
                  <react_native_1.Text style={s.infoText}>Only approved driver accounts can access this app</react_native_1.Text>
                </react_native_1.View>
              </>) : (<>
                <react_native_1.TouchableOpacity onPress={() => setStep('phone')} style={{ marginBottom: theme_1.Spacing.md }}>
                  <vector_icons_1.Ionicons name="arrow-back" size={22} color={theme_1.Colors.text}/>
                </react_native_1.TouchableOpacity>
                <react_native_1.Text style={s.title}>Verify OTP</react_native_1.Text>
                <react_native_1.Text style={s.subtitle}>
                  Code sent to{' '}
                  <react_native_1.Text style={{ color: theme_1.Colors.brand, fontWeight: '700' }}>{phone}</react_native_1.Text>
                </react_native_1.Text>
                <react_native_1.View style={s.otpRow}>
                  {otp.map((digit, i) => (<react_native_1.TextInput key={i} ref={(r) => { otpRefs.current[i] = r; }} style={[s.otpBox, digit ? s.otpBoxFilled : null]} value={digit} onChangeText={(v) => handleOtpChange(v.replace(/\D/g, '').slice(-1), i)} keyboardType="number-pad" maxLength={1} textAlign="center" selectTextOnFocus/>))}
                </react_native_1.View>
                <react_native_1.TouchableOpacity style={[s.btn, otp.join('').length < 6 && { opacity: 0.5 }]} onPress={handleVerifyOtp} disabled={loading || otp.join('').length < 6} activeOpacity={0.85}>
                  {loading ? <react_native_1.ActivityIndicator color={theme_1.Colors.white}/> : <react_native_1.Text style={s.btnText}>Verify & Login</react_native_1.Text>}
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity onPress={handleSendOtp} style={{ alignItems: 'center', marginTop: 14 }}>
                  <react_native_1.Text style={{ fontSize: 13, color: theme_1.Colors.textMuted }}>
                    Didn't get it? <react_native_1.Text style={{ color: theme_1.Colors.brand, fontWeight: '600' }}>Resend</react_native_1.Text>
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </>)}
          </react_native_1.View>
        </react_native_1.ScrollView>
      </react_native_1.KeyboardAvoidingView>
    </react_native_safe_area_context_1.SafeAreaView>);
}
const s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.dark },
    scroll: { flexGrow: 1, padding: theme_1.Spacing.xl },
    header: { alignItems: 'center', paddingVertical: 40 },
    logoBox: { width: 72, height: 72, borderRadius: 22, backgroundColor: theme_1.Colors.brand, alignItems: 'center', justifyContent: 'center', marginBottom: theme_1.Spacing.md, ...theme_1.Shadow.lg },
    appName: { fontSize: 30, fontWeight: '800', color: theme_1.Colors.white, letterSpacing: -0.5 },
    appSub: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
    card: { backgroundColor: theme_1.Colors.white, borderRadius: 24, padding: theme_1.Spacing.xl, ...theme_1.Shadow.lg },
    title: { fontSize: 22, fontWeight: '700', color: theme_1.Colors.text, marginBottom: 6 },
    subtitle: { fontSize: 14, color: theme_1.Colors.textMuted, marginBottom: theme_1.Spacing.xl, lineHeight: 20 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg,
        borderWidth: 1.5, borderColor: theme_1.Colors.border,
        marginBottom: theme_1.Spacing.lg, paddingHorizontal: theme_1.Spacing.md,
    },
    input: { flex: 1, fontSize: 16, color: theme_1.Colors.text, paddingVertical: 14 },
    btn: { backgroundColor: theme_1.Colors.brand, borderRadius: theme_1.Radius.lg, paddingVertical: 15, alignItems: 'center', ...theme_1.Shadow.sm },
    btnText: { color: theme_1.Colors.white, fontSize: 16, fontWeight: '700' },
    infoBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: theme_1.Spacing.lg, backgroundColor: '#eff6ff', padding: 12, borderRadius: theme_1.Radius.md },
    infoText: { flex: 1, fontSize: 12, color: theme_1.Colors.info, lineHeight: 16 },
    otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme_1.Spacing.xl, gap: 8 },
    otpBox: { width: 46, height: 56, borderRadius: theme_1.Radius.md, backgroundColor: theme_1.Colors.surface, borderWidth: 1.5, borderColor: theme_1.Colors.border, fontSize: 22, fontWeight: '700', color: theme_1.Colors.text },
    otpBoxFilled: { borderColor: theme_1.Colors.brand, backgroundColor: theme_1.Colors.brandLight },
});
//# sourceMappingURL=DriverLoginScreen.js.map