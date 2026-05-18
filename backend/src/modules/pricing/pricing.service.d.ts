import type { VehicleType } from '@taxiflow/shared-types';
interface CreatePricingRuleInput {
    tenantId: string;
    zoneId?: string;
    vehicleType: VehicleType;
    baseFare: number;
    perKmRate: number;
    perMinuteRate: number;
    minimumFare: number;
    bookingFee?: number;
    nightMultiplier?: number;
    nightStartHour?: number;
    nightEndHour?: number;
}
export declare function createPricingRule(input: CreatePricingRuleInput): Promise<any>;
export declare function updatePricingRule(ruleId: string, tenantId: string, data: Partial<Omit<CreatePricingRuleInput, 'tenantId'>>): Promise<any>;
export declare function getPricingRules(tenantId: string): Promise<any>;
export declare function deletePricingRule(ruleId: string, tenantId: string): Promise<void>;
interface CreateZoneInput {
    tenantId: string;
    name: string;
    description?: string;
    polygon: Array<{
        latitude: number;
        longitude: number;
    }>;
}
export declare function createZone(input: CreateZoneInput): Promise<any>;
export declare function getZones(tenantId: string): Promise<any>;
export declare function updateZone(zoneId: string, tenantId: string, data: {
    name?: string;
    description?: string;
    polygon?: Array<{
        latitude: number;
        longitude: number;
    }>;
}): Promise<any>;
export declare function deleteZone(zoneId: string, tenantId: string): Promise<void>;
interface CreateSurgeInput {
    tenantId: string;
    zoneId?: string;
    multiplier: number;
    reason: string;
    startTime: Date;
    endTime: Date;
}
export declare function createSurgePricing(input: CreateSurgeInput): Promise<any>;
export declare function getSurgePricing(tenantId: string, activeOnly?: boolean): Promise<any>;
export declare function deactivateSurge(surgeId: string, tenantId: string): Promise<any>;
export {};
//# sourceMappingURL=pricing.service.d.ts.map