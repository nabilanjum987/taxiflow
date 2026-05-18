# TaxiFlow — Phase 4: Mobile Apps

## ✅ Both Apps Complete

| App | Platform | Tech | Purpose |
|---|---|---|---|
| **Passenger App** | iOS + Android | React Native + Expo | Passengers book rides |
| **Driver App** | iOS + Android | React Native + Expo | Drivers accept & complete rides |

---

## 📱 Passenger App Features

| Screen | Features |
|---|---|
| **Login** | Phone number → OTP → auto create account |
| **Home (Map)** | Live Google Map, pickup/dropoff inputs, vehicle selector, fare estimate, cash/card payment, book ride button |
| **Booking Flow** | Searching → Driver Assigned → Driver on Map → Arrived → In Progress → Completed |
| **Active Ride** | Real-time driver location on map, driver info card, call driver button, ETA |
| **Ride History** | Full booking history with status, route, fare |
| **Profile** | Stats, saved addresses, notification settings, logout |

---

## 🚗 Driver App Features

| Screen | Features |
|---|---|
| **Login** | Phone number → OTP (DRIVER role only) |
| **Home (Map)** | Online/offline toggle, earnings strip, GPS broadcasting |
| **Incoming Booking** | Modal popup with 30s countdown, accept/decline, passenger info, fare, route |
| **Active Trip** | Step-by-step: I've Arrived → Start Ride → Complete Ride |
| **Passenger Info** | Name, phone, call button, payment method |
| **Earnings** | Today/7d/30d toggle, total earnings, trips, per-trip average, daily breakdown |
| **Profile** | Driver status, documents upload status, vehicle info, all-time stats, logout |

---

## 🚀 Running on Device / Simulator

### Prerequisites
```bash
# Install Expo CLI
npm install -g expo-cli eas-cli

# Install dependencies
cd apps/passenger-app && pnpm install
cd apps/driver-app && pnpm install
```

### Run Passenger App
```bash
cd apps/passenger-app
cp .env.example .env
# Fill in EXPO_PUBLIC_TENANT_ID with your tenant UUID

expo start
# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Scan QR with Expo Go app for physical device
```

### Run Driver App
```bash
cd apps/driver-app
cp .env.example .env
expo start --port 8082
```

---

## ⚙️ Environment Variables

Both apps need a `.env` file:

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_SOCKET_URL=http://localhost:3000
EXPO_PUBLIC_TENANT_ID=<client-tenant-uuid>
EXPO_PUBLIC_EAS_PROJECT_ID=<from-eas-build>
```

**For production** replace localhost with your deployed API URL.

---

## 📦 Building for Production (EAS)

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to Expo
eas login

# 3. Configure project
eas build:configure

# 4. Build for both platforms
cd apps/passenger-app
eas build --platform all

cd apps/driver-app
eas build --platform all

# 5. Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## 🗺️ Google Maps Setup (Per Client)

Each client needs their own Google Maps key:

1. Client creates a Google Cloud project
2. Enables Maps SDK for Android + iOS
3. Creates API key (restricted to app bundle ID)
4. Admin enters key in admin panel Settings → API Keys
5. Rebuild app with new key in `app.json`

---

## 🔔 Push Notifications

Notifications use Expo's push service in development.
For production, configure Firebase Cloud Messaging (FCM):

1. Create Firebase project
2. Download `google-services.json` (Android) + `GoogleService-Info.plist` (iOS)
3. Add to respective app roots
4. Update `app.json` with Firebase config
5. Backend sends via Firebase Admin SDK (Phase 5)

---

## 🏗️ Architecture Summary

```
Passenger App                    Backend                    Driver App
─────────────                    ───────                    ──────────
Book ride          ──POST──>   /bookings                   
                               Finds nearby drivers
                               Notifies drivers   ──socket─>  Booking popup
                  <──socket──  BOOKING_ACCEPTED             Accept booking
                               Marks driver ON_TRIP
                  <──socket──  DRIVER_LOCATION   <──socket──  GPS every 5s
Driver on map                  Stores in Redis
                               Tracks trip
Complete ride      <──socket──  RIDE_COMPLETED   <──POST──   /bookings/:id/complete
Payment confirmed              Creates payment record
Receipt email                  Updates driver earnings
Rate driver        ──POST──>   /ratings
```

---

## ✅ Complete TaxiFlow Platform Summary

| Phase | Status | What Was Built |
|---|---|---|
| **Phase 1** | ✅ Done | Monorepo, backend foundation, Prisma schema, auth, Socket.io, job queues |
| **Phase 2** | ✅ Done | Bookings, drivers, passengers, pricing, payments (Stripe), notifications, ratings, promotions, reports, support |
| **Phase 3** | ✅ Done | Admin Panel, Dispatcher Panel, Super Admin, Landing Site |
| **Phase 4** | ✅ Done | Passenger App (React Native), Driver App (React Native) |
| **Phase 5** | 🔜 Next | White-label automation, Stripe subscription billing, Firebase push, deployment, CI/CD |

---

## 🔜 Phase 5 — Launch & Sell

- Automated tenant onboarding (payment → instant setup)
- Stripe subscription billing for our clients
- Firebase push notifications (production-grade)
- Custom domain per client (subdomain routing)
- Docker + deployment scripts
- CI/CD pipeline (GitHub Actions)
- Production monitoring (Sentry, Grafana)
- App Store + Play Store submission guides

Say **"Phase 5"** to build the final launch infrastructure.
