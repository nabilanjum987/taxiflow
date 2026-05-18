import { Request, Response, NextFunction } from 'express';
import type { Tenant, TenantSettings } from '@taxiflow/shared-types';
declare global {
    namespace Express {
        interface Request {
            tenantId: string;
            tenant: Tenant;
            tenantSettings: TenantSettings;
        }
    }
}
export declare function tenantMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void>;
/**
 * Super admin bypass — validates super admin token
 * Allows cross-tenant data access for our platform admin
 */
export declare function superAdminTenantBypass(req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=tenantMiddleware.d.ts.map