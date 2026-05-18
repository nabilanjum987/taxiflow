// ============================================================
// modules/tenants/tenants.service.ts
// Tenant management + automated onboarding flow
// agent.md: Step 6 — auto-creates tenant after payment
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { cacheSet, cacheDel } from '../../config/redis';
import { createModuleLogger } from '../../config/logger';
import {
  BCRYPT_ROUNDS,
  ERROR_CODES,
  HTTP_STATUS,
  CACHE_KEYS,
  CACHE_TTL,
} from '@taxiflow/shared-constants';
import { slugify } from '@taxiflow/shared-utils';
import { encryptApiKey, decryptApiKey } from '../../utils/encryption';
import { maskApiKey } from '@taxiflow/shared-utils';
import { ApiError } from '../../utils/ApiError';
import type { Tenant, TenantSettings, TenantApiKey, ApiKeyProvider } from '@taxiflow/shared-types';

const logger = createModuleLogger('tenants-service');

// ─── CREATE TENANT (automated onboarding) ─────────────────

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

export async function createTenant(input: CreateTenantInput): Promise<{
  tenant: Tenant;
  adminCredentials: { email: string; temporaryPassword: string };
}> {
  const {
    name, email, phone, country, currency, timezone,
    adminFirstName, adminLastName, adminPassword,
    subscriptionPlanId, stripeCustomerId, stripeSubscriptionId,
  } = input;

  // Check email uniqueness
  const existing = await prisma.tenant.findFirst({ where: { email } });
  if (existing) {
    throw new ApiError('Email already in use', HTTP_STATUS.CONFLICT, ERROR_CODES.EMAIL_ALREADY_EXISTS);
  }

  // Generate unique slug from company name
  let slug = slugify(name);
  const slugExists = await prisma.tenant.findUnique({ where: { slug } });
  if (slugExists) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  // Hash admin password
  const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);

  const tenantId = uuidv4();
  const adminUserId = uuidv4();

  // Run entire onboarding in a single transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create tenant
    const tenant = await tx.tenant.create({
      data: {
        id: tenantId,
        name,
        slug,
        email,
        phone,
        country,
        currency,
        timezone,
        status: 'TRIAL',
      },
    });

    // 2. Create default tenant settings
    await tx.tenantSettings.create({
      data: {
        id: uuidv4(),
        tenantId,
      },
    });

    // 3. Create admin user
    await tx.user.create({
      data: {
        id: adminUserId,
        tenantId,
        email,
        phone,
        firstName: adminFirstName,
        lastName: adminLastName,
        role: 'TENANT_ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: true,
        passwordHash,
      },
    });

    // 4. Link subscription
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial

    await tx.tenantSubscription.create({
      data: {
        id: uuidv4(),
        tenantId,
        planId: subscriptionPlanId,
        status: 'TRIALING',
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEnd,
        stripeSubscriptionId: stripeSubscriptionId ?? null,
        stripeCustomerId: stripeCustomerId ?? null,
      },
    });

    return tenant;
  });

  logger.info('Tenant created via automated onboarding', { tenantId, slug });

  return {
    tenant: result as unknown as Tenant,
    adminCredentials: {
      email,
      temporaryPassword: adminPassword,
    },
  };
}

// ─── GET TENANT ───────────────────────────────────────────

export async function getTenantById(tenantId: string): Promise<Tenant> {
  const cached = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!cached) {
    throw new ApiError('Tenant not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.TENANT_NOT_FOUND);
  }
  return cached as unknown as Tenant;
}

// ─── UPDATE TENANT BRANDING ───────────────────────────────

interface UpdateBrandingInput {
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export async function updateTenantBranding(
  tenantId: string,
  input: UpdateBrandingInput,
): Promise<Tenant> {
  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: input,
  });

  // Bust cache
  await cacheDel(CACHE_KEYS.tenant(tenantId));

  logger.info('Tenant branding updated', { tenantId });
  return updated as unknown as Tenant;
}

// ─── UPDATE TENANT SETTINGS ───────────────────────────────

export async function updateTenantSettings(
  tenantId: string,
  input: Partial<TenantSettings>,
): Promise<TenantSettings> {
  const updated = await prisma.tenantSettings.upsert({
    where: { tenantId },
    create: { id: uuidv4(), tenantId, ...input },
    update: input,
  });

  await cacheDel(CACHE_KEYS.tenantSettings(tenantId));

  logger.info('Tenant settings updated', { tenantId });
  return updated as unknown as TenantSettings;
}

// ─── API KEY MANAGEMENT ───────────────────────────────────

/**
 * Store a client's API key — encrypted at rest per agent.md security rules
 * Client provides their own keys — we NEVER use our keys for client ops
 */
export async function storeApiKey(
  tenantId: string,
  provider: ApiKeyProvider,
  plainTextKey: string,
): Promise<void> {
  const encrypted = encryptApiKey(plainTextKey);

  await prisma.tenantApiKey.upsert({
    where: { tenantId_provider: { tenantId, provider } },
    create: {
      id: uuidv4(),
      tenantId,
      provider,
      encryptedKey: encrypted.encryptedKey,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      isConfigured: true,
    },
    update: {
      encryptedKey: encrypted.encryptedKey,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      isConfigured: true,
    },
  });

  // Bust API keys cache
  await cacheDel(CACHE_KEYS.tenantApiKeys(tenantId));

  logger.info('API key stored (encrypted)', { tenantId, provider });
}

/**
 * Retrieve decrypted API key for a tenant — for internal backend use only
 * NEVER return decrypted keys in API responses
 */
export async function getDecryptedApiKey(
  tenantId: string,
  provider: ApiKeyProvider,
): Promise<string> {
  const record = await prisma.tenantApiKey.findUnique({
    where: { tenantId_provider: { tenantId, provider } },
  });

  if (!record || !record.isConfigured) {
    throw new ApiError(
      `API key for ${provider} not configured. Please add it in Settings.`,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  return decryptApiKey({
    encryptedKey: record.encryptedKey,
    iv: record.iv,
    authTag: record.authTag,
  });
}

/**
 * Get API key statuses — masked, safe to return to admin panel
 * NEVER returns actual key values
 */
export async function getApiKeyStatuses(tenantId: string): Promise<
  Array<{ provider: ApiKeyProvider; isConfigured: boolean; maskedKey?: string }>
> {
  const keys = await prisma.tenantApiKey.findMany({
    where: { tenantId },
  });

  return keys.map((k) => ({
    provider: k.provider as ApiKeyProvider,
    isConfigured: k.isConfigured,
    maskedKey: k.isConfigured
      ? maskApiKey(k.encryptedKey.slice(0, 16)) // only mask, not decrypt
      : undefined,
  }));
}

// ─── SUPER ADMIN — ALL TENANTS ────────────────────────────

export async function getAllTenants(page: number, limit: number): Promise<{
  tenants: Tenant[];
  total: number;
}> {
  const skip = (page - 1) * limit;
  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { subscription: { include: { plan: true } } },
    }),
    prisma.tenant.count(),
  ]);

  return { tenants: tenants as unknown as Tenant[], total };
}

export async function suspendTenant(tenantId: string, reason: string): Promise<void> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { status: 'SUSPENDED' },
  });
  await cacheDel(CACHE_KEYS.tenant(tenantId));
  logger.info('Tenant suspended', { tenantId, reason });
}

export async function activateTenant(tenantId: string): Promise<void> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { status: 'ACTIVE' },
  });
  await cacheDel(CACHE_KEYS.tenant(tenantId));
  logger.info('Tenant activated', { tenantId });
}
