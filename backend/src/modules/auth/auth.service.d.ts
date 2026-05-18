import type { UserRole, AuthTokens, AuthUser } from '@taxiflow/shared-types';
interface RegisterInput {
    tenantId: string;
    phone: string;
    email?: string;
    firstName: string;
    lastName: string;
    password?: string;
    role: UserRole;
}
export declare function registerUser(input: RegisterInput): Promise<AuthUser>;
export declare function sendOtp(tenantId: string, phone: string): Promise<void>;
export declare function verifyOtp(tenantId: string, phone: string, code: string): Promise<AuthUser & {
    tokens: AuthTokens;
}>;
export declare function loginWithPassword(tenantId: string, email: string, password: string): Promise<AuthUser & {
    tokens: AuthTokens;
}>;
export declare function refreshAccessToken(refreshToken: string): Promise<AuthTokens>;
export declare function logout(refreshToken: string): Promise<void>;
export declare function logoutAllDevices(userId: string): Promise<void>;
export {};
//# sourceMappingURL=auth.service.d.ts.map