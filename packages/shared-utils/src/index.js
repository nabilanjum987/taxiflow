"use strict";
// ============================================================
// @taxiflow/shared-utils — Shared utility functions
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFare = calculateFare;
exports.calculateDistanceKm = calculateDistanceKm;
exports.toRadians = toRadians;
exports.kmToMiles = kmToMiles;
exports.milesToKm = milesToKm;
exports.isPointInPolygon = isPointInPolygon;
exports.generateOtpCode = generateOtpCode;
exports.formatCurrency = formatCurrency;
exports.formatDistance = formatDistance;
exports.formatDuration = formatDuration;
exports.formatPhoneNumber = formatPhoneNumber;
exports.maskApiKey = maskApiKey;
exports.maskEmail = maskEmail;
exports.maskPhone = maskPhone;
exports.buildPagination = buildPagination;
exports.isNightTime = isNightTime;
exports.addMinutes = addMinutes;
exports.addDays = addDays;
exports.startOfDay = startOfDay;
exports.endOfDay = endOfDay;
exports.slugify = slugify;
exports.generateRandomString = generateRandomString;
exports.capitalize = capitalize;
exports.roundToTwoDecimals = roundToTwoDecimals;
exports.clamp = clamp;
exports.omitKeys = omitKeys;
exports.pickKeys = pickKeys;
const shared_constants_1 = require("@taxiflow/shared-constants");
function calculateFare(input) {
    const { distanceKm, durationMinutes, vehicleType, pricingRule, surgeMultiplier = 1, promoDiscountAmount = 0, isNightRate = false, } = input;
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
function calculateDistanceKm(point1, point2) {
    const EARTH_RADIUS_KM = 6371;
    const dLat = toRadians(point2.latitude - point1.latitude);
    const dLon = toRadians(point2.longitude - point1.longitude);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(point1.latitude)) *
            Math.cos(toRadians(point2.latitude)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
}
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}
function kmToMiles(km) {
    return km * 0.621371;
}
function milesToKm(miles) {
    return miles * 1.60934;
}
/**
 * Check if a coordinate is inside a polygon (ray casting algorithm)
 */
function isPointInPolygon(point, polygon) {
    const { latitude: lat, longitude: lng } = point;
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = polygon[i].longitude;
        const yi = polygon[i].latitude;
        const xj = polygon[j].longitude;
        const yj = polygon[j].latitude;
        const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
        if (intersect)
            inside = !inside;
    }
    return inside;
}
// ─── OTP ──────────────────────────────────────────────────
function generateOtpCode(length = 6) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
}
// ─── FORMATTING ───────────────────────────────────────────
function formatCurrency(amount, currency) {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}
function formatDistance(km, unit) {
    if (unit === 'MILES') {
        const miles = kmToMiles(km);
        return `${miles.toFixed(1)} mi`;
    }
    return `${km.toFixed(1)} km`;
}
function formatDuration(minutes) {
    if (minutes < 60)
        return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}
function formatPhoneNumber(phone) {
    // Normalize to E.164 format
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        return `+44${cleaned.slice(1)}`; // UK default
    }
    return cleaned.startsWith('+') ? phone : `+${cleaned}`;
}
function maskApiKey(key) {
    if (key.length <= 8)
        return '****';
    return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`;
}
function maskEmail(email) {
    const [local, domain] = email.split('@');
    if (!local || !domain)
        return email;
    const masked = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : '***';
    return `${masked}@${domain}`;
}
function maskPhone(phone) {
    if (phone.length < 6)
        return '****';
    return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
}
function buildPagination(page = shared_constants_1.PAGINATION.DEFAULT_PAGE, limit = shared_constants_1.PAGINATION.DEFAULT_LIMIT, total = 0) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), shared_constants_1.PAGINATION.MAX_LIMIT);
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
function isNightTime(hour, startHour, endHour) {
    // Handles overnight periods e.g. 22:00 - 06:00
    if (startHour > endHour) {
        return hour >= startHour || hour < endHour;
    }
    return hour >= startHour && hour < endHour;
}
function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60 * 1000);
}
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}
// ─── STRING UTILS ─────────────────────────────────────────
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
function capitalize(str) {
    if (!str)
        return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
// ─── MATH ─────────────────────────────────────────────────
function roundToTwoDecimals(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
// ─── OBJECT UTILS ─────────────────────────────────────────
function omitKeys(obj, keys) {
    const result = { ...obj };
    keys.forEach((key) => delete result[key]);
    return result;
}
function pickKeys(obj, keys) {
    const result = {};
    keys.forEach((key) => {
        if (key in obj)
            result[key] = obj[key];
    });
    return result;
}
//# sourceMappingURL=index.js.map