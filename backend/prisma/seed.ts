// ============================================================
// prisma/seed.ts — Database seeder
// Seeds: subscription plans, super admin user
// Run: pnpm --filter backend prisma:seed
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_PLANS, BCRYPT_ROUNDS } from '@taxiflow/shared-constants';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  // ─── SUBSCRIPTION PLANS ─────────────────────────────────

  for (const [, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: {
        priceMonthly: plan.priceMonthly,
        maxDrivers: plan.maxDrivers,
      },
      create: {
        id: uuidv4(),
        name: plan.name,
        slug: plan.slug,
        priceMonthly: plan.priceMonthly,
        currency: plan.currency,
        maxDrivers: plan.maxDrivers,
        features: getFeatures(plan.slug),
        isActive: true,
      },
    });
    console.log(`✅ Plan seeded: ${plan.name}`);
  }

  // ─── SUPER ADMIN TENANT ───────────────────────────────

  let superAdminTenant = await prisma.tenant.findFirst({
    where: { slug: 'taxiflow-internal' },
  });

  if (!superAdminTenant) {
    superAdminTenant = await prisma.tenant.create({
      data: {
        id: uuidv4(),
        name: 'TaxiFlow Internal',
        slug: 'taxiflow-internal',
        email: 'admin@taxiflow.com',
        phone: '+44000000000',
        country: 'GB',
        currency: 'GBP',
        timezone: 'Europe/London',
        status: 'ACTIVE',
      },
    });

    await prisma.tenantSettings.create({
      data: { id: uuidv4(), tenantId: superAdminTenant.id },
    });

    console.log('✅ Super admin tenant created');
  }

  // ─── SUPER ADMIN USER ─────────────────────────────────

  const superAdminEmail = 'superadmin@taxiflow.com';
  const existing = await prisma.user.findFirst({
    where: { email: superAdminEmail, tenantId: superAdminTenant.id },
  });

  if (!existing) {
    const password = process.env.SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!';
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await prisma.user.create({
      data: {
        id: uuidv4(),
        tenantId: superAdminTenant.id,
        email: superAdminEmail,
        phone: '+44000000001',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: true,
        passwordHash,
      },
    });
    console.log(`✅ Super admin created: ${superAdminEmail}`);
    console.log(`   Password: ${password}`);
    console.log(`   ⚠️  Change this password immediately!`);
  }

  console.log('✅ Database seeding complete');
}

function getFeatures(slug: string): string[] {
  const base = [
    'Passenger app (white labelled)',
    'Driver app (white labelled)',
    'Admin panel',
    'Dispatcher panel',
    'Web booking portal',
    'Email support',
  ];

  const advanced = [
    'Priority support',
    'Custom domain',
    'API access',
    'Advanced analytics',
    'Corporate accounts module',
  ];

  if (slug === 'pro' || slug === 'enterprise') {
    return [...base, ...advanced];
  }

  return base;
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
