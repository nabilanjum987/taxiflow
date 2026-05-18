import type { FareEstimate, PricingRule, VehicleType, GeoCoordinate } from '@taxiflow/shared-types';
export interface FareCalculationInput {
    distanceKm: number;
    durationMinutes: number;
    vehicleType: VehicleType;
    pricingRule: PricingRule;
    surgeMultiplier?: number;
    promoDiscountAmount?: number;
    isNightRate?: boolean;
}
export declare function calculateFare(input: FareCalculationInput): FareEstimate;
/**
 * Haversine formula — calculates distance between two GPS coordinates
 * Returns distance in kilometres
 */
export declare function calculateDistanceKm(point1: GeoCoordinate, point2: GeoCoordinate): number;
export declare function toRadians(degrees: number): number;
export declare function kmToMiles(km: number): number;
export declare function milesToKm(miles: number): number;
/**
 * Check if a coordinate is inside a polygon (ray casting algorithm)
 */
export declare function isPointInPolygon(point: GeoCoordinate, polygon: GeoCoordinate[]): boolean;
export declare function generateOtpCode(length?: number): string;
export declare function formatCurrency(amount: number, currency: string): string;
export declare function formatDistance(km: number, unit: 'MILES' | 'KILOMETRES'): string;
export declare function formatDuration(minutes: number): string;
export declare function formatPhoneNumber(phone: string): string;
export declare function maskApiKey(key: string): string;
export declare function maskEmail(email: string): string;
export declare function maskPhone(phone: string): string;
export interface PaginationMeta {
    page: number;
    limit: number;
    skip: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
export declare function buildPagination(page?: number, limit?: number, total?: number): PaginationMeta;
export declare function isNightTime(hour: number, startHour: number, endHour: number): boolean;
export declare function addMinutes(date: Date, minutes: number): Date;
export declare function addDays(date: Date, days: number): Date;
export declare function startOfDay(date: Date): Date;
export declare function endOfDay(date: Date): Date;
export declare function slugify(text: string): string;
export declare function generateRandomString(length: number): string;
export declare function capitalize(str: string): string;
export declare function roundToTwoDecimals(value: number): number;
export declare function clamp(value: number, min: number, max: number): number;
export declare function omitKeys<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>;
export declare function pickKeys<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
//# sourceMappingURL=index.d.ts.map