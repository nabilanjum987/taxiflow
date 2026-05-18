import { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@taxiflow/shared-types';
export interface JwtPayload {
    userId: string;
    tenantId: string;
    role: UserRole;
    iat: number;
    exp: number;
}
declare global {
    namespace Express {
        interface Request {
            user: {
                id: string;
                tenantId: string;
                role: UserRole;
                email: string | null;
                phone: string;
                firstName: string;
                lastName: string;
            };
        }
    }
}
export declare function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void>;
/**
 * Role-based access control middleware factory
 * Usage: authorize('TENANT_ADMIN', 'DISPATCHER')
 */
export declare function authorize(...roles: UserRole[]): (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Super admin only access
 */
export declare function superAdminOnly(req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=authMiddleware.d.ts.map