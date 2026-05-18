// src/constants/theme.ts — Driver App design tokens
import { StyleSheet } from 'react-native';

export const Colors = {
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
} as const;

export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
} as const;

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 999,
} as const;

export const Shadow = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
} as const;
