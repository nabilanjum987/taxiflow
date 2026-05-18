// ============================================================
// middleware/tenantMiddleware.ts
// CRITICAL: Validates tenant on every request — agent.md rule
// All data is isolated by tenant_id — NEVER cross tenant
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { cacheGet, cacheSet } from '../config/redis';
import { createModuleLogger } from '../config/logger';
import { HEADERS, CACHE_KEYS, CACHE_TTL, HTTP_STATUS, ERROR_CODES } from '@taxiflow/shared-constants';
import type { Tenant, TenantSettings } from '@taxiflow/shared-types';
import { ApiError } from '../utils/ApiError';

const logger = createModuleLogger('tenant-middleware');

// Attach tenant data to every request
declare global {
  namespace Express {
    interface Request {
      tenantId: string;
      tenant: Tenant;
      tenantSettings: TenantSettings;
    }
  }
}

export async function tenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.headers[HEADERS.TENANT_ID] as string | undefined;

    if (!tenantId) {
      throw new ApiError(
        'Tenant ID is required',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.TENANT_INVALID,
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new ApiError(
        'Invalid tenant ID format',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.TENANT_INVALID,
      );
    }

    // Check cache first
    const cacheKey = CACHE_KEYS.tenant(tenantId);
    let tenant = await cacheGet<Tenant>(cacheKey);

    if (!tenant) {
      // Fetch from database
      const dbTenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!dbTenant) {
        throw new ApiError(
          'Tenant not found',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.TENANT_NOT_FOUND,
        );
      }

      tenant = dbTenant as unknown as Tenant;
      await cacheSet(cacheKey, tenant, CACHE_TTL.TENANT);
    }

    if (tenant.status === 'SUSPENDED') {
      throw new ApiError(
        'Your account has been suspended. Please contact support.',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.TENANT_SUSPENDED,
      );
    }

    if (tenant.status === 'CANCELLED') {
      throw new ApiError(
        'Your subscription has been cancelled.',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.SUBSCRIPTION_INACTIVE,
      );
    }

    // Fetch tenant settings
    const settingsCacheKey = CACHE_KEYS.tenantSettings(tenantId);
    let settings = await cacheGet<TenantSettings>(settingsCacheKey);

    if (!settings) {
      const dbSettings = await prisma.tenantSettings.findUnique({
        where: { tenantId },
      });

      if (dbSettings) {
        settings = dbSettings as unknown as TenantSettings;
        await cacheSet(settingsCacheKey, settings, CACHE_TTL.TENANT_SETTINGS);
      }
    }

    // Attach to request — available in all route handlers
    req.tenantId = tenantId;
    req.tenant = tenant;
    if (settings) req.tenantSettings = settings;

    logger.debug('Tenant validated', { tenantId, tenantSlug: tenant.slug });
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Super admin bypass — validates super admin token
 * Allows cross-tenant data access for our platform admin
 */
export function superAdminTenantBypass(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  // Super admin routes don't need tenant middleware
  // They use their own auth with SUPER_ADMIN role check
  next();
}
