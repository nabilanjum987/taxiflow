// src/screens/auth/DriverLoginScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/stores';
import api from '../../lib/api';
import { Colors, Spacing, Radius, Shadow } from '../../constants/theme';
import type { AuthUser } from '@taxiflow/shared-types';

const TENANT_ID = process.env.EXPO_PUBLIC_TENANT_ID ?? '';

export default function DriverLoginScreen(): React.JSX.Element {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<Array<TextInput | null>>([]);
  const { setAuth } = useAuthStore();

  const handleSendOtp = async (): Promise<void> => {
    if (phone.trim().length < 7) {
      Alert.alert('Invalid number', 'Please enter a valid phone number.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone: phone.trim() }, {
        headers: { 'x-tenant-id': TENANT_ID },
      });
      setStep('otp');
    } catch {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (): Promise<void> => {
    const code = otp.join('');
    if (code.length < 6) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { phone: phone.trim(), code }, {
        headers: { 'x-tenant-id': TENANT_ID },
      });
      const { user, accessToken } = res.data.data as { user: AuthUser; accessToken: string };
      if (user.role !== 'DRIVER') {
        Alert.alert('Wrong App', 'This app is for drivers only. Please use the passenger app.');
        return;
      }
      await setAuth(user, accessToken, TENANT_ID);
    } catch {
      Alert.alert('Invalid OTP', 'The code entered is incorrect or expired.');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number): void => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (!value && index > 0) otpRefs.current[index - 1]?.focus();
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={s.header}>
            <View style={s.logoBox}>
              <Ionicons name="car-sport" size={30} color={Colors.white} />
            </View>
            <Text style={s.appName}>CityRide</Text>
            <Text style={s.appSub}>Driver Partner App</Text>
          </View>

          <View style={s.card}>
            {step === 'phone' ? (
              <>
                <Text style={s.title}>Driver Login</Text>
                <Text style={s.subtitle}>Enter your registered phone number</Text>
                <View style={s.inputWrapper}>
                  <Ionicons name="call-outline" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={s.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+44 7700 000000"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                    autoFocus
                    onSubmitEditing={handleSendOtp}
                  />
                </View>
                <TouchableOpacity style={s.btn} onPress={handleSendOtp} disabled={loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.btnText}>Send OTP →</Text>}
                </TouchableOpacity>
                <View style={s.infoBox}>
                  <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
                  <Text style={s.infoText}>Only approved driver accounts can access this app</Text>
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={() => setStep('phone')} style={{ marginBottom: Spacing.md }}>
                  <Ionicons name="arrow-back" size={22} color={Colors.text} />
                </TouchableOpacity>
                <Text style={s.title}>Verify OTP</Text>
                <Text style={s.subtitle}>
                  Code sent to{' '}
                  <Text style={{ color: Colors.brand, fontWeight: '700' }}>{phone}</Text>
                </Text>
                <View style={s.otpRow}>
                  {otp.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={(r) => { otpRefs.current[i] = r; }}
                      style={[s.otpBox, digit ? s.otpBoxFilled : null]}
                      value={digit}
                      onChangeText={(v) => handleOtpChange(v.replace(/\D/g, '').slice(-1), i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      textAlign="center"
                      selectTextOnFocus
                    />
                  ))}
                </View>
                <TouchableOpacity
                  style={[s.btn, otp.join('').length < 6 && { opacity: 0.5 }]}
                  onPress={handleVerifyOtp}
                  disabled={loading || otp.join('').length < 6}
                  activeOpacity={0.85}
                >
                  {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.btnText}>Verify & Login</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSendOtp} style={{ alignItems: 'center', marginTop: 14 }}>
                  <Text style={{ fontSize: 13, color: Colors.textMuted }}>
                    Didn't get it? <Text style={{ color: Colors.brand, fontWeight: '600' }}>Resend</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scroll: { flexGrow: 1, padding: Spacing.xl },
  header: { alignItems: 'center', paddingVertical: 40 },
  logoBox: { width: 72, height: 72, borderRadius: 22, backgroundColor: Colors.brand, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, ...Shadow.lg },
  appName: { fontSize: 30, fontWeight: '800', color: Colors.white, letterSpacing: -0.5 },
  appSub: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  card: { backgroundColor: Colors.white, borderRadius: 24, padding: Spacing.xl, ...Shadow.lg },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: Spacing.xl, lineHeight: 20 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    marginBottom: Spacing.lg, paddingHorizontal: Spacing.md,
  },
  input: { flex: 1, fontSize: 16, color: Colors.text, paddingVertical: 14 },
  btn: { backgroundColor: Colors.brand, borderRadius: Radius.lg, paddingVertical: 15, alignItems: 'center', ...Shadow.sm },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.lg, backgroundColor: '#eff6ff', padding: 12, borderRadius: Radius.md },
  infoText: { flex: 1, fontSize: 12, color: Colors.info, lineHeight: 16 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xl, gap: 8 },
  otpBox: { width: 46, height: 56, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, fontSize: 22, fontWeight: '700', color: Colors.text },
  otpBoxFilled: { borderColor: Colors.brand, backgroundColor: Colors.brandLight },
});
