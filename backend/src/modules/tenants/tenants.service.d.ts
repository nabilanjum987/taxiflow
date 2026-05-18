import type { Tenant, TenantSettings, ApiKeyProvider } from '@taxiflow/shared-types';
interface CreateTenantInput {
    name: string;
    email: string;
    phone: string;
    country: string;
    currency: string;
    timezone: string;
    adminFirstName: string;
    adminLastName: string;
    adminPassword: string;
    subscriptionPlanId: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
}
export declare function createTenant(input: CreateTenantInput): Promise<{
    tenant: Tenant;
    adminCredentials: {
        email: string;
        temporaryPassword: string;
    };
}>;
export declare function getTenantById(tenantId: string): Promise<Tenant>;
interface UpdateBrandingInput {
    name?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
}
export declare function updateTenantBranding(tenantId: string, input: UpdateBrandingInput): Promise<Tenant>;
export declare function updateTenantSettings(tenantId: string, input: Partial<TenantSettings>): Promise<TenantSettings>;
/**
 * Store a client's API key — encrypted at rest per agent.md security rules
 * Client provides their own keys — we NEVER use our keys for client ops
 */
export declare function storeApiKey(tenantId: string, provider: ApiKeyProvider, plainTextKey: string): Promise<void>;
/**
 * Retrieve decrypted API key for a tenant — for internal backend use only
 * NEVER return decrypted keys in API responses
 */
export declare function getDecryptedApiKey(tenantId: string, provider: ApiKeyProvider): Promise<string>;
/**
 * Get API key statuses — masked, safe to return to admin panel
 * NEVER returns actual key values
 */
export declare function getApiKeyStatuses(tenantId: string): Promise<Array<{
    provider: ApiKeyProvider;
    isConfigured: boolean;
    maskedKey?: string;
}>>;
export declare function getAllTenants(page: number, limit: number): Promise<{
    tenants: Tenant[];
    total: number;
}>;
export declare function suspendTenant(tenantId: string, reason: string): Promise<void>;
export declare function activateTenant(tenantId: string): Promise<void>;
export {};
//# sourceMappingURL=tenants.service.d.ts.map