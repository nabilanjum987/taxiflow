// ============================================================
// @taxiflow/shared-utils — Shared utility functions
// ============================================================

import type { FareEstimate, PricingRule, VehicleType, GeoCoordinate } from '@taxiflow/shared-types';
import { PAGINATION } from '@taxiflow/shared-constants';

// ─── FARE CALCULATION ─────────────────────────────────────

export interface FareCalculationInput {
  distanceKm: number;
  durationMinutes: number;
  vehicleType: VehicleType;
  pricingRule: PricingRule;
  surgeMultiplier?: number;
  promoDiscountAmount?: number;
  isNightRate?: boolean;
}

export function calculateFare(input: FareCalculationInput): FareEstimate {
  const {
    distanceKm,
    durationMinutes,
    vehicleType,
    pricingRule,
    surgeMultiplier = 1,
    promoDiscountAmount = 0,
    isNightRate = false,
  } = input;

  const nightMultiplier = isNightRate ? pricingRule.nightMultiplier : 1;
  const effectiveSurge = surgeMultiplier * nightMultiplier;

  const distanceFare = distanceKm * pricingRule.perKmRate;
  const timeFare = durationMinutes * pricingRule.perMinuteRate;
  const subtotal = (pricingRule.baseFare + distanceFare + timeFare) * effectiveSurge;
  const withBookingFee = subtotal + pricingRule.bookingFee;
  const afterDiscount = Math.max(0, withBookingFee - promoDiscountAmount);
  const estimatedFare = Math.max(pricingRule.minimumFare, afterDiscount);

  return {
    vehicleType,
    estimatedFare: roundToTwoDecimals(estimatedFare),
    currency: 'GBP', // caller should override with tenant currency
    distanceKm: roundToTwoDecimals(distanceKm),
    durationMinutes: Math.round(durationMinutes),
    breakdown: {
      baseFare: roundToTwoDecimals(pricingRule.baseFare),
      distanceFare: roundToTwoDecimals(distanceFare),
      timeFare: roundToTwoDecimals(timeFare),
      bookingFee: roundToTwoDecimals(pricingRule.bookingFee),
      surgeMultiplier: effectiveSurge,
      discount: roundToTwoDecimals(promoDiscountAmount),
    },
  };
}

// ─── DISTANCE / GEO ───────────────────────────────────────

/**
 * Haversine formula — calculates distance between two GPS coordinates
 * Returns distance in kilometres
 */
export function calculateDistanceKm(
  point1: GeoCoordinate,
  point2: GeoCoordinate,
): number {
  const EARTH_RADIUS_KM = 6371;
  const dLat = toRadians(point2.latitude - point1.latitude);
  const dLon = toRadians(point2.longitude - point1.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) *
      Math.cos(toRadians(point2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function kmToMiles(km: number): number {
  return km * 0.621371;
}

export function milesToKm(miles: number): number {
  return miles * 1.60934;
}

/**
 * Check if a coordinate is inside a polygon (ray casting algorithm)
 */
export function isPointInPolygon(point: GeoCoordinate, polygon: GeoCoordinate[]): boolean {
  const { latitude: lat, longitude: lng } = point;
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ─── OTP ──────────────────────────────────────────────────

export function generateOtpCode(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

// ─── FORMATTING ───────────────────────────────────────────

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDistance(km: number, unit: 'MILES' | 'KILOMETRES'): string {
  if (unit === 'MILES') {
    const miles = kmToMiles(km);
    return `${miles.toFixed(1)} mi`;
  }
  return `${km.toFixed(1)} km`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

export function formatPhoneNumber(phone: string): string {
  // Normalize to E.164 format
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    return `+44${cleaned.slice(1)}`; // UK default
  }
  return cleaned.startsWith('+') ? phone : `+${cleaned}`;
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const masked = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : '***';
  return `${masked}@${domain}`;
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return '****';
  return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
}

// ─── PAGINATION ───────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  skip: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function buildPagination(
  page: number = PAGINATION.DEFAULT_PAGE,
  limit: number = PAGINATION.DEFAULT_LIMIT,
  total: number = 0,
): PaginationMeta {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), PAGINATION.MAX_LIMIT);
  const totalPages = Math.ceil(total / safeLimit);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    total,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}

// ─── DATE / TIME ──────────────────────────────────────────

export function isNightTime(hour: number, startHour: number, endHour: number): boolean {
  // Handles overnight periods e.g. 22:00 - 06:00
  if (startHour > endHour) {
    return hour >= startHour || hour < endHour;
  }
  return hour >= startHour && hour < endHour;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// ─── STRING UTILS ─────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ─── MATH ─────────────────────────────────────────────────

export function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ─── OBJECT UTILS ─────────────────────────────────────────

export function omitKeys<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result as Omit<T, K>;
}

export function pickKeys<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) result[key] = obj[key];
  });
  return result;
}
