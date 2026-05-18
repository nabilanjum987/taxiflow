# 🚖 TaxiFlow — White-Label Taxi Booking SaaS

> Build once. Sell forever. Any taxi company worldwide.

---

## Phase 1 Status: ✅ Foundation Complete

| Component | Status |
|---|---|
| Monorepo (Turborepo + pnpm) | ✅ |
| Shared Types | ✅ |
| Shared Constants | ✅ |
| Shared Utils | ✅ |
| Backend (Express + TypeScript) | ✅ |
| PostgreSQL + Prisma Schema | ✅ (24 tables) |
| Redis | ✅ |
| Multi-Tenant Middleware | ✅ |
| Auth System (JWT + OTP) | ✅ |
| Socket.io Real-time | ✅ |
| Job Queues (Bull) | ✅ |
| Scheduled Jobs (node-cron) | ✅ |
| Security (helmet, rate limit, bcrypt) | ✅ |
| Encryption (AES-256-GCM) | ✅ |

---

## 🛠️ Prerequisites

- Node.js v20+
- pnpm v9+
- PostgreSQL 15+
- Redis 7+

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
pnpm install
```

### 2. Set up environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env — fill in DATABASE_URL, REDIS_URL, JWT secrets
```

### 3. Generate JWT secrets
```bash
# Run this twice — one for ACCESS, one for REFRESH
openssl rand -base64 64

# Generate encryption key (32 bytes hex)
openssl rand -hex 32
```

### 4. Set up database
```bash
# Create PostgreSQL database
createdb taxiflow_dev

# Run migrations
pnpm backend:migrate

# Seed initial data (subscription plans + super admin)
pnpm --filter backend prisma:seed
```

### 5. Start development
```bash
# Start backend only
pnpm backend:dev

# Or start all (when frontend apps are added)
pnpm dev
```

Backend runs at: `http://localhost:3000`  
Health check: `http://localhost:3000/health`

---

## 📁 Project Structure

```
taxiflow/
├── apps/
│   ├── passenger-app/     React Native — Phase 4
│   ├── driver-app/        React Native — Phase 4
│   ├── admin-panel/       React + Vite — Phase 3
│   ├── dispatcher-panel/  React + Vite — Phase 3
│   ├── super-admin/       React + Vite — Phase 3
│   └── landing-site/      Next.js — Phase 3
├── packages/
│   ├── shared-types/      ✅ All TypeScript interfaces
│   ├── shared-utils/      ✅ Utility functions
│   ├── shared-constants/  ✅ All constants & enums
│   └── ui-components/     Phase 3
└── backend/
    ├── src/
    │   ├── modules/       Feature modules
    │   ├── middleware/     ✅ Auth, tenant, error, rate-limit
    │   ├── config/        ✅ DB, Redis, Logger, Env
    │   ├── sockets/       ✅ Socket.io real-time engine
    │   ├── jobs/          ✅ Bull queues + cron jobs
    │   └── app.ts         ✅ Entry point
    └── prisma/
        └── schema.prisma  ✅ 24 tables, all enums
```

---

## 🔌 API Endpoints (Phase 1)

Base URL: `http://localhost:3000/api/v1`

All requests require header: `x-tenant-id: {tenantId}`

### Auth
```
POST   /auth/register        Register passenger
POST   /auth/login           Email + password login
POST   /auth/send-otp        Request OTP via phone
POST   /auth/verify-otp      Verify OTP — returns tokens
POST   /auth/refresh-token   Refresh access token
POST   /auth/logout          Logout (revoke refresh token)
POST   /auth/logout-all      Revoke all sessions
GET    /auth/me              Get current user
```

### Tenants
```
GET    /tenants/me              Get tenant info
PATCH  /tenants/me/branding     Update logo/colors
PATCH  /tenants/me/settings     Update settings
GET    /tenants/me/api-keys     Get API key statuses (masked)
POST   /tenants/me/api-keys     Store encrypted API key

# Super admin only
GET    /tenants                 All tenants
POST   /tenants/:id/suspend     Suspend tenant
POST   /tenants/:id/activate    Activate tenant
```

---

## 🗄️ Database Schema

24 tables covering all features:

| Category | Tables |
|---|---|
| Multi-tenant | tenants, tenant_settings, tenant_api_keys |
| Subscriptions | subscription_plans, tenant_subscriptions, invoices |
| Users | users, refresh_tokens, otp_codes |
| Drivers | drivers, vehicles, driver_documents |
| Passengers | passengers, saved_addresses |
| Bookings | bookings, booking_tracking |
| Payments | payments, payouts |
| Pricing | pricing_rules, zones, surge_pricing |
| Engagement | ratings, promotions, corporate_accounts |
| Operations | notifications, support_tickets |

---

## 🔐 Security

- JWT access tokens: 15 min expiry
- Refresh tokens: 30 days, rotated on use, stored in httpOnly cookie
- Passwords: bcrypt rounds 12
- OTP: 6 digits, 5 min expiry, 3 max attempts
- Client API keys: AES-256-GCM encrypted in database
- Rate limiting: auth (10/15min), OTP (5/hour), API (100/min)
- Multi-tenant isolation: every query filtered by tenant_id
- Input validation: Zod on every endpoint

---

## 🔄 Phase 2 Next Steps

```
Week 3-4:
- Booking system APIs (create, assign, track status)
- Driver management APIs (approve, online/offline, earnings)
- Passenger management APIs
- Pricing & zones APIs
- Real-time tracking system
- Stripe payment integration
- Firebase push notifications
- Twilio SMS (using tenant's own credentials)
```

---

## 📋 Rules (from agent.md)

1. TypeScript strict mode — no `any` types
2. Every endpoint validates input with Zod
3. Every DB query includes `tenant_id` filter
4. Never store API keys unencrypted
5. Use `logger` — never `console.log`
6. Use `async/await` — never callbacks
7. Error handling on every async function
8. UUIDs for all IDs — never auto-increment integers

---

*TaxiFlow v1.0.0 — Phase 1 Foundation*
