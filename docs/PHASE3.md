# TaxiFlow — Phase 3 Complete

## ✅ All 4 Web Apps Built

| App | Port | Stack | Purpose |
|---|---|---|---|
| **Admin Panel** | 3001 | React + Vite + Tailwind | Client admin dashboard |
| **Dispatcher Panel** | 3002 | React + Vite + Socket.io | Real-time dispatch |
| **Super Admin** | 3003 | React + Vite | Our platform management |
| **Landing Site** | 3004 | Next.js 14 | White-label public + booking |

---

## 🚀 Run All Apps

```bash
# Install all dependencies from root
pnpm install

# Run everything at once
pnpm dev

# Or run individually:
pnpm --filter admin-panel dev        # :3001
pnpm --filter dispatcher-panel dev   # :3002
pnpm --filter super-admin dev        # :3003
pnpm --filter landing-site dev       # :3004
```

---

## ⚙️ Environment Setup

### Admin Panel (`apps/admin-panel/.env`)
```
VITE_API_URL=http://localhost:3000/api/v1
```

### Dispatcher Panel (`apps/dispatcher-panel/.env`)
```
VITE_API_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
```

### Super Admin (`apps/super-admin/.env`)
```
VITE_API_URL=http://localhost:3000/api/v1
VITE_SUPER_TENANT_ID=<super-admin-tenant-id-from-seed>
```

### Landing Site (`apps/landing-site/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_TENANT_ID=<client-tenant-id>
```

---

## 📱 App Features

### Admin Panel (`:3001`)
Full white-label dashboard for each taxi company client:
- **Dashboard** — live stats, revenue chart, pending approvals, recent bookings
- **Bookings** — full list with filters, search, status, pagination + detail view with refund/cancel
- **Drivers** — approve/reject/suspend, earnings chart, vehicles, documents
- **Passengers** — list with search
- **Pricing** — fare rules per vehicle type, surge pricing with zones
- **Payments** — transaction history, revenue charts, driver payouts
- **Promotions** — create/toggle promo codes with usage tracking
- **Support** — ticket management with status updates
- **Settings** — branding colours/logo, encrypted API keys, booking toggles

### Dispatcher Panel (`:3002`)
Real-time dispatch console — always open, always live:
- **Live booking feed** — new bookings appear instantly via Socket.io
- **Active vs All** tabs — focus on what matters
- **Booking detail** — full route, passenger/driver info, cancel button
- **Manual driver assignment** — assign nearest online driver with one click
- **Online drivers sidebar** — live GPS positions, status, vehicle info
- **Stats footer** — today's bookings, revenue, driver count

### Super Admin (`:3003`)
Our platform management — sees all clients:
- **Client list** — all tenants with plan, subscription status, country
- **Create client** — full onboarding form → creates tenant + admin user instantly
- **Suspend/Activate** — one-click tenant management
- **Subscription tracking** — plan names, prices, trial/active status
- **Stats row** — total clients, active, trial, suspended counts

### Landing Site (`:3004`)
White-label public site — one per client, custom branded:
- **Hero** — bold headline, stats, CTA buttons
- **Live booking widget** — phone → OTP → confirm, all in page
- **Vehicle selector** — Standard, Executive, MPV, WAV with prices
- **Scheduled booking** — future date/time picker
- **Features section** — Always on time, Safe & Vetted, Top Rated
- **Pricing section** — per vehicle type
- **App download** — App Store / Play Store links
- **Contact section** — phone, email, hours
- **Full footer**

---

## 🔐 Login Credentials (After Seed)

**Admin Panel / Dispatcher**
- Go to `http://localhost:3001`
- Enter your `Tenant ID` (from DB after seed or onboarding)
- Email: admin email used during tenant creation
- Password: password set during creation

**Super Admin**
- Go to `http://localhost:3003`
- Email: `superadmin@taxiflow.com`
- Password: value of `SUPER_ADMIN_PASSWORD` env var (default: `ChangeMe123!`)
- **Change this immediately after first login**

---

## 🎨 White-Label Customisation

Each landing site install is customised per client:

1. Set `NEXT_PUBLIC_TENANT_ID` to the client's tenant UUID
2. Update company name in `src/app/page.tsx` (line: `CityRide`)
3. Add client logo to `/public/logo.png`
4. Colours auto-pulled from tenant branding settings in admin panel

---

## 📋 Phase 4 — Mobile Apps (Next)

```
apps/passenger-app/   React Native (Expo) — iOS + Android
apps/driver-app/      React Native (Expo) — iOS + Android

Features:
- Passenger: book, track driver on map, payment, ratings, history
- Driver: go online, accept bookings, navigate, earnings
- Real Google Maps integration (tenant's own key)
- Firebase push notifications
- Stripe card payments in-app
```

Say **"Phase 4"** to build the mobile apps.
