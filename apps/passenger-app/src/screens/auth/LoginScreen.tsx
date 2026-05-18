// src/screens/auth/LoginScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { Colors, Spacing, Radius, Shadow } from '../../constants/theme';
import type { AuthUser } from '@taxiflow/shared-types';

const TENANT_ID = process.env.EXPO_PUBLIC_TENANT_ID ?? '';

type Step = 'phone' | 'otp';

export default function LoginScreen(): React.JSX.Element {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<Array<TextInput | null>>([]);
  const { setAuth } = useAuthStore();

  const handleSendOtp = async (): Promise<void> => {
    if (phone.trim().length < 7) {
      Alert.alert('Invalid number', 'Please enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone: phone.trim() }, {
        headers: { 'x-tenant-id': TENANT_ID },
      });
      setStep('otp');
    } catch {
      Alert.alert('Error', 'Failed to send OTP. Please check your number and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (): Promise<void> => {
    const code = otp.join('');
    if (code.length < 6) {
      Alert.alert('Enter OTP', 'Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { phone: phone.trim(), code }, {
        headers: { 'x-tenant-id': TENANT_ID },
      });
      const { user, accessToken } = res.data.data as { user: AuthUser; accessToken: string };
      await setAuth(user, accessToken, TENANT_ID);
    } catch {
      Alert.alert('Invalid OTP', 'The code you entered is incorrect or expired.');
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
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    if (!value && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Ionicons name="car" size={28} color={Colors.white} />
            </View>
            <Text style={styles.appName}>CityRide</Text>
            <Text style={styles.tagline}>Your city, your ride</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {step === 'phone' ? (
              <>
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>Enter your phone number to continue</Text>

                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+44 7700 000000"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSendOtp}
                  />
                </View>

                <TouchableOpacity style={styles.btnPrimary} onPress={handleSendOtp} disabled={loading} activeOpacity={0.85}>
                  {loading
                    ? <ActivityIndicator color={Colors.white} />
                    : <Text style={styles.btnPrimaryText}>Send OTP Code →</Text>
                  }
                </TouchableOpacity>

                <Text style={styles.disclaimer}>
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </Text>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={() => setStep('phone')} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={20} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Enter OTP</Text>
                <Text style={styles.subtitle}>
                  We sent a 6-digit code to{'\n'}
                  <Text style={styles.phoneHighlight}>{phone}</Text>
                </Text>

                <View style={styles.otpRow}>
                  {otp.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={(ref) => { otpRefs.current[i] = ref; }}
                      style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                      value={digit}
                      onChangeText={(v) => handleOtpChange(v.replace(/\D/g, '').slice(-1), i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      textAlign="center"
                      selectTextOnFocus
                    />
                  ))}
                </View>

                <TouchableOpacity style={styles.btnPrimary} onPress={handleVerifyOtp} disabled={loading || otp.join('').length < 6} activeOpacity={0.85}>
                  {loading
                    ? <ActivityIndicator color={Colors.white} />
                    : <Text style={styles.btnPrimaryText}>Verify & Continue</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSendOtp} style={styles.resendBtn}>
                  <Text style={styles.resendText}>Didn't receive it? <Text style={styles.resendLink}>Resend</Text></Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scroll: { flexGrow: 1, padding: Spacing.xl },
  header: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  logoBox: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: Colors.brand, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md, ...Shadow.lg,
  },
  appName: { fontSize: 28, fontWeight: '800', color: Colors.white, letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  card: {
    backgroundColor: Colors.white, borderRadius: 24,
    padding: Spacing.xl, ...Shadow.lg,
  },
  backBtn: { marginBottom: Spacing.md, alignSelf: 'flex-start', padding: 4 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: Spacing.xl, lineHeight: 20 },
  phoneHighlight: { color: Colors.brand, fontWeight: '600' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    marginBottom: Spacing.lg, paddingHorizontal: Spacing.md,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: Colors.text, paddingVertical: 14 },
  btnPrimary: {
    backgroundColor: Colors.brand, borderRadius: Radius.lg,
    paddingVertical: 15, alignItems: 'center',
    ...Shadow.sm,
  },
  btnPrimaryText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  disclaimer: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md, lineHeight: 16 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xl, gap: 8 },
  otpBox: {
    width: 46, height: 56, borderRadius: Radius.md,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    fontSize: 22, fontWeight: '700', color: Colors.text,
  },
  otpBoxFilled: { borderColor: Colors.brand, backgroundColor: Colors.brandLight },
  resendBtn: { alignItems: 'center', marginTop: Spacing.lg, paddingVertical: 8 },
  resendText: { fontSize: 13, color: Colors.textMuted },
  resendLink: { color: Colors.brand, fontWeight: '600' },
});
