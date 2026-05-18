import { z } from 'zod';
export declare const fareEstimateSchema: z.ZodObject<{
    pickupLatitude: z.ZodNumber;
    pickupLongitude: z.ZodNumber;
    dropoffLatitude: z.ZodNumber;
    dropoffLongitude: z.ZodNumber;
    vehicleType: z.ZodEnum<["STANDARD", "EXECUTIVE", "MPV", "WAV"]>;
    promoCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    vehicleType: "STANDARD" | "EXECUTIVE" | "MPV" | "WAV";
    pickupLatitude: number;
    dropoffLatitude: number;
    pickupLongitude: number;
    dropoffLongitude: number;
    promoCode?: string | undefined;
}, {
    vehicleType: "STANDARD" | "EXECUTIVE" | "MPV" | "WAV";
    pickupLatitude: number;
    dropoffLatitude: number;
    pickupLongitude: number;
    dropoffLongitude: number;
    promoCode?: string | undefined;
}>;
export declare const createBookingSchema: z.ZodObject<{
    pickupAddress: z.ZodString;
    pickupLatitude: z.ZodNumber;
    pickupLongitude: z.ZodNumber;
    dropoffAddress: z.ZodString;
    dropoffLatitude: z.ZodNumber;
    dropoffLongitude: z.ZodNumber;
    vehicleType: z.ZodEnum<["STANDARD", "EXECUTIVE", "MPV", "WAV"]>;
    paymentMethod: z.ZodEnum<["CARD", "CASH", "CORPORATE"]>;
    promoCode: z.ZodOptional<z.ZodString>;
    scheduledAt: z.ZodEffects<z.ZodOptional<z.ZodString>, Date | undefined, string | undefined>;
    notes: z.ZodOptional<z.ZodString>;
    corporateAccountId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    vehicleType: "STANDARD" | "EXECUTIVE" | "MPV" | "WAV";
    pickupAddress: string;
    dropoffAddress: string;
    pickupLatitude: number;
    dropoffLatitude: number;
    paymentMethod: "CARD" | "CASH" | "CORPORATE";
    pickupLongitude: number;
    dropoffLongitude: number;
    scheduledAt?: Date | undefined;
    promoCode?: string | undefined;
    notes?: string | undefined;
    corporateAccountId?: string | undefined;
}, {
    vehicleType: "STANDARD" | "EXECUTIVE" | "MPV" | "WAV";
    pickupAddress: string;
    dropoffAddress: string;
    pickupLatitude: number;
    dropoffLatitude: number;
    paymentMethod: "CARD" | "CASH" | "CORPORATE";
    pickupLongitude: number;
    dropoffLongitude: number;
    scheduledAt?: string | undefined;
    promoCode?: string | undefined;
    notes?: string | undefined;
    corporateAccountId?: string | undefined;
}>;
export declare const cancelBookingSchema: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const assignDriverSchema: z.ZodObject<{
    driverId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    driverId: string;
}, {
    driverId: string;
}>;
export declare const getBookingsQuerySchema: z.ZodObject<{
    page: z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>;
    limit: z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>;
    status: z.ZodOptional<z.ZodEnum<["PENDING", "SEARCHING", "ACCEPTED", "DRIVER_ARRIVED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_DRIVER_FOUND"]>>;
    driverId: z.ZodOptional<z.ZodString>;
    passengerId: z.ZodOptional<z.ZodString>;
    dateFrom: z.ZodEffects<z.ZodOptional<z.ZodString>, Date | undefined, string | undefined>;
    dateTo: z.ZodEffects<z.ZodOptional<z.ZodString>, Date | undefined, string | undefined>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    status?: "CANCELLED" | "PENDING" | "SEARCHING" | "ACCEPTED" | "DRIVER_ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "NO_DRIVER_FOUND" | undefined;
    driverId?: string | undefined;
    passengerId?: string | undefined;
    dateFrom?: Date | undefined;
    dateTo?: Date | undefined;
}, {
    status?: "CANCELLED" | "PENDING" | "SEARCHING" | "ACCEPTED" | "DRIVER_ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "NO_DRIVER_FOUND" | undefined;
    page?: string | undefined;
    driverId?: string | undefined;
    limit?: string | undefined;
    passengerId?: string | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
}>;
//# sourceMappingURL=bookings.validation.d.ts.map