# TaxiFlow — Phase 5 Complete | Full Platform Launch Guide

## ✅ ALL 5 PHASES DONE — Platform Ready to Sell

---

## 📦 Complete Platform Summary

| Phase | What Was Built | Files |
|---|---|---|
| **Phase 1** | Monorepo, backend foundation, Prisma (24 tables), auth, Socket.io, Bull queues | 41 |
| **Phase 2** | Bookings, drivers, passengers, pricing, payments, ratings, promotions, reports, support | +21 |
| **Phase 3** | Admin Panel, Dispatcher Panel, Super Admin, Landing Site (4 web apps) | +52 |
| **Phase 4** | Passenger App + Driver App (React Native, iOS + Android) | +31 |
| **Phase 5** | Automated onboarding, Stripe billing, Firebase push, Docker, CI/CD, email system | +15 |
| **Total** | **Complete white-label taxi SaaS** | **160+ files / 17,000+ lines** |

---

## 🚀 Launch in 3 Steps

### Step 1 — Server Setup (1 time)

Provision a server (minimum 2 vCPU, 4GB RAM — DigitalOcean, AWS, Hetzner):

```bash
# On your server (Ubuntu 22.04)
git clone https://github.com/yourrepo/taxiflow.git
cd taxiflow
cp .env.production.example .env.production
nano .env.production   # Fill in all values
bash scripts/deploy.sh
```

That's it. Everything starts automatically.

### Step 2 — Configure Stripe (1 time)

1. Create products in Stripe dashboard:
   - Starter: £99/month → copy price ID → `STRIPE_PRICE_STARTER`
   - Business: £199/month → `STRIPE_PRICE_BUSINESS`
   - Pro: £349/month → `STRIPE_PRICE_PRO`
   - Enterprise: £599/month → `STRIPE_PRICE_ENTERPRISE`

2. Add webhook endpoint in Stripe:
   - URL: `https://api.yourdomain.com/api/v1/webhooks/stripe`
   - Events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`
   - Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`

### Step 3 — Sell (forever)

Add a "Get Started" button on your landing site that calls:

```
POST /api/v1/subscriptions/checkout
{
  "planSlug": "starter",
  "companyName": "ABC Taxis",
  "adminEmail": "owner@abctaxis.com",
  ...
}
```

Client pays → Stripe fires webhook → **onboarding runs automatically** → welcome email sent with credentials → client logs in → they're live. **Zero manual work from you.**

---

## 🤖 Automated Onboarding Flow

When a client pays, this all happens automatically:

```
Client pays on your site
    ↓
Stripe fires checkout.session.completed webhook
    ↓
TaxiFlow verifies Stripe signature
    ↓
runOnboarding() executes:
  1. Creates tenant record
  2. Creates default settings
  3. Creates admin user with temp password
  4. Creates subscription record
  5. Records first invoice
    ↓
Welcome email sent with:
  - Tenant ID
  - Admin Panel URL
  - Temp password
  - Next steps guide
    ↓
Client logs in → configures API keys → goes live
```

---

## 💰 Revenue Model

| Plan | Price | Max Drivers | Your Cost |
|---|---|---|---|
| Starter | £99/mo | 15 | ~£8/mo server |
| Business | £199/mo | 50 | ~£15/mo server |
| Pro | £349/mo | 150 | ~£25/mo server |
| Enterprise | £599/mo | Unlimited | ~£40/mo server |

**At 10 clients on Business plan = £1,990/month recurring revenue.**

Each client also pays for their own: Google Maps API, Twilio, Stripe (their transaction fees). We pay for nothing except our server + SendGrid.

---

## 📧 Automated Emails (All Built)

| Trigger | Email |
|---|---|
| Payment confirmed | Welcome email with credentials + setup guide |
| Day 3, not configured | Setup reminder (3 remaining steps) |
| Monthly renewal | Payment receipt |
| Payment failed | Action required — update card |
| Plan cancelled | Churn prevention email |
| Driver approved | Congratulations + login instructions |
| Driver rejected | Rejection reason |
| Ride completed | Passenger receipt with route + fare |

---

## 🏗️ Infrastructure

```
Internet
    ↓
Nginx (SSL termination, rate limiting, WebSocket proxy)
    ↓
TaxiFlow Backend (Express + Socket.io)
    ↓ ↓ ↓
PostgreSQL  Redis  Bull Queues
(data)    (cache) (background jobs)
```

All services run in Docker containers. Zero-downtime deploys via GitHub Actions.

---

## ⚙️ Environment Variables Checklist

```bash
# Required before going live:
✅ POSTGRES_PASSWORD       — strong random password
✅ JWT_ACCESS_SECRET       — openssl rand -base64 64
✅ JWT_REFRESH_SECRET      — openssl rand -base64 64
✅ ENCRYPTION_KEY          — openssl rand -hex 32
✅ STRIPE_SECRET_KEY       — from Stripe dashboard
✅ STRIPE_WEBHOOK_SECRET   — from Stripe webhook setup
✅ STRIPE_PRICE_STARTER    — Stripe price ID
✅ STRIPE_PRICE_BUSINESS   — Stripe price ID
✅ STRIPE_PRICE_PRO        — Stripe price ID
✅ STRIPE_PRICE_ENTERPRISE — Stripe price ID
✅ SENDGRID_API_KEY        — from SendGrid
✅ FIREBASE_SERVICE_ACCOUNT_JSON — from Firebase console
```

---

## 🔒 Security Checklist

```
✅ JWT access tokens expire in 15 minutes
✅ Refresh tokens rotate on every use
✅ bcrypt rounds: 12 (per agent.md)
✅ OTP: 6 digits, 5 min expiry, 3 max attempts
✅ All client API keys: AES-256-GCM encrypted at rest
✅ Stripe webhook: signature verified on every event
✅ Rate limiting: auth (10/15min), API (100/min), OTP (5/hour)
✅ Multi-tenant isolation: every query filtered by tenant_id
✅ Input validation: Zod on every endpoint
✅ Helmet.js: security headers on every response
✅ CORS: whitelist only
✅ Docker: non-root user in containers
✅ Nginx: raw IP hidden, TLS 1.2+ only
✅ No API keys in logs (masked before logging)
✅ No passwords in responses (passwordHash never returned)
```

---

## 📱 App Store Submission

### Passenger App
1. Create Apple Developer account (£79/year)
2. Create Google Play Developer account ($25 one-time)
3. `eas build --platform all` (builds in cloud, no Mac needed)
4. `eas submit --platform ios` + `eas submit --platform android`
5. Change app name from "CityRide" to client's brand

### Per-Client White Labelling
Each client gets their own branded app. Change these per client:
- App name in `app.json` → `"name": "ClientTaxis"`
- Bundle ID → `"bundleIdentifier": "com.clienttaxis.passenger"`
- Primary colour in theme.ts
- Logo assets
- `EXPO_PUBLIC_TENANT_ID` in `.env`

---

## 🛠️ Day-to-Day Operations

```bash
# View live logs
docker compose logs -f backend

# Restart backend only (zero-downtime)
docker compose restart backend

# Run a database query
docker compose exec postgres psql -U taxiflow taxiflow_prod

# Monitor Redis
docker compose exec redis redis-cli monitor

# Manual backup
bash scripts/backup.sh

# Check health
curl https://api.yourdomain.com/health

# View all tenants (super admin)
# POST https://api.yourdomain.com/api/v1/auth/login
# GET  https://api.yourdomain.com/api/v1/tenants
```

---

## 🎯 What to Do This Week

| Day | Task |
|---|---|
| Monday | Provision server, run `deploy.sh`, verify health check |
| Tuesday | Set up Stripe products + webhook, test onboarding flow |
| Wednesday | Configure SendGrid, test all emails |
| Thursday | Build passenger app with `eas build`, submit to stores |
| Friday | Go to first sales call with demo tenant ready |

---

*TaxiFlow v5.0 — Complete White-Label Taxi SaaS*
*Built with: Node.js, TypeScript, PostgreSQL, Redis, React Native, Expo, Socket.io, Stripe, SendGrid, Firebase, Docker, GitHub Actions*
