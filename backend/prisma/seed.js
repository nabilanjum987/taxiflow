"use strict";
// ============================================================
// prisma/seed.ts — Database seeder
// Seeds: subscription plans, super admin user
// Run: pnpm --filter backend prisma:seed
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const shared_constants_1 = require("@taxiflow/shared-constants");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    // ─── SUBSCRIPTION PLANS ─────────────────────────────────
    for (const [, plan] of Object.entries(shared_constants_1.SUBSCRIPTION_PLANS)) {
        await prisma.subscriptionPlan.upsert({
            where: { slug: plan.slug },
            update: {
                priceMonthly: plan.priceMonthly,
                maxDrivers: plan.maxDrivers,
            },
            create: {
                id: (0, uuid_1.v4)(),
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
                id: (0, uuid_1.v4)(),
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
            data: { id: (0, uuid_1.v4)(), tenantId: superAdminTenant.id },
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
        const passwordHash = await bcryptjs_1.default.hash(password, shared_constants_1.BCRYPT_ROUNDS);
        await prisma.user.create({
            data: {
                id: (0, uuid_1.v4)(),
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
function getFeatures(slug) {
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
//# sourceMappingURL=seed.js.map