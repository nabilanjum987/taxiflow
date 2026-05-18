// ============================================================
// middleware/authMiddleware.ts
// JWT verification + role-based access control
// agent.md: NEVER create endpoints without authentication
// ============================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { createModuleLogger } from '../config/logger';
import { env } from '../config/env';
import { HTTP_STATUS, ERROR_CODES } from '@taxiflow/shared-constants';
import type { UserRole } from '@taxiflow/shared-types';
import { ApiError } from '../utils/ApiError';

const logger = createModuleLogger('auth-middleware');

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

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(
        'Access token is required',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_INVALID,
      );
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new ApiError(
        'Access token is required',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_INVALID,
      );
    }

    // Verify JWT
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new ApiError(
          'Access token expired',
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.TOKEN_EXPIRED,
        );
      }
      throw new ApiError(
        'Invalid access token',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_INVALID,
      );
    }

    // Fetch user from DB — verifies they still exist + not suspended
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new ApiError(
        'User not found',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_INVALID,
      );
    }

    if (user.status === 'SUSPENDED') {
      throw new ApiError(
        'Your account has been suspended',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.ACCOUNT_SUSPENDED,
      );
    }

    if (user.status === 'INACTIVE') {
      throw new ApiError(
        'Your account is inactive',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.ACCOUNT_SUSPENDED,
      );
    }

    // For non-super-admin users, ensure tenant matches
    if (user.role !== 'SUPER_ADMIN' && req.tenantId && user.tenantId !== req.tenantId) {
      logger.warn('Tenant mismatch attempted', {
        userId: user.id,
        userTenantId: user.tenantId,
        requestTenantId: req.tenantId,
      });
      throw new ApiError(
        'Access denied',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
      );
    }

    req.user = {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role as UserRole,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role-based access control middleware factory
 * Usage: authorize('TENANT_ADMIN', 'DISPATCHER')
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError('Authentication required', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID));
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Unauthorized role access attempted', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
      });
      next(new ApiError('You do not have permission to access this resource', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN));
      return;
    }

    next();
  };
}

/**
 * Super admin only access
 */
export function superAdminOnly(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    next(new ApiError('Super admin access required', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN));
    return;
  }
  next();
}
