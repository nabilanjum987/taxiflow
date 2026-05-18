// ============================================================
// @taxiflow/shared-types — All shared TypeScript interfaces
// Used across backend, web panels, and mobile apps
// ============================================================

// ─── TENANT ────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string; // used in subdomain e.g. acme.taxiflow.com
  email: string;
  phone: string;
  address: string;
  country: string;
  currency: string; // ISO 4217 e.g. GBP, USD
  timezone: string; // IANA e.g. Europe/London
  distanceUnit: DistanceUnit;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  status: TenantStatus;
  subscriptionPlanId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED';
export type DistanceUnit = 'MILES' | 'KILOMETRES';

export interface TenantSettings {
  id: string;
  tenantId: string;
  allowScheduledBookings: boolean;
  allowCashPayments: boolean;
  allowCardPayments: boolean;
  autoAssignDriver: boolean;
  driverAcceptTimeoutSeconds: number;
  maxSearchRadiusKm: number;
  requireDriverApproval: boolean;
  cancellationWindowMinutes: number;
  ratingEnabled: boolean;
  corporateEnabled: boolean;
  whatsappEnabled: boolean;
  updatedAt: Date;
}

// ─── USER ──────────────────────────────────────────────────

export interface User {
  id: string;
  tenantId: string;
  email: string | null;
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole =
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN'
  | 'DISPATCHER'
  | 'DRIVER'
  | 'PASSENGER';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';

// ─── DRIVER ───────────────────────────────────────────────

export interface Driver {
  id: string;
  tenantId: string;
  userId: string;
  licenseNumber: string;
  licenseExpiry: Date;
  status: DriverStatus;
  onlineStatus: DriverOnlineStatus;
  currentLatitude: number | null;
  currentLongitude: number | null;
  currentHeading: number | null;
  rating: number;
  totalTrips: number;
  totalEarnings: number;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankSortCode: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type DriverStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'INACTIVE';

export type DriverOnlineStatus = 'ONLINE' | 'OFFLINE' | 'ON_TRIP';

// ─── VEHICLE ──────────────────────────────────────────────

export interface Vehicle {
  id: string;
  tenantId: string;
  driverId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  vehicleType: VehicleType;
  seats: number;
  isActive: boolean;
  insuranceExpiry: Date;
  motExpiry: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type VehicleType = 'STANDARD' | 'EXECUTIVE' | 'MPV' | 'WAV';

// ─── PASSENGER ────────────────────────────────────────────

export interface Passenger {
  id: string;
  tenantId: string;
  userId: string;
  rating: number;
  totalTrips: number;
  savedAddresses: SavedAddress[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedAddress {
  id: string;
  label: string; // 'Home', 'Work', etc.
  fullAddress: string;
  latitude: number;
  longitude: number;
}

// ─── BOOKING ──────────────────────────────────────────────

export interface Booking {
  id: string;
  tenantId: string;
  passengerId: string;
  driverId: string | null;
  vehicleId: string | null;
  corporateAccountId: string | null;
  status: BookingStatus;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  vehicleType: VehicleType;
  estimatedFare: number;
  actualFare: number | null;
  distance: number | null; // in km
  duration: number | null; // in minutes
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  promoCode: string | null;
  discountAmount: number;
  scheduledAt: Date | null;
  acceptedAt: Date | null;
  arrivedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type BookingStatus =
  | 'PENDING'
  | 'SEARCHING'
  | 'ACCEPTED'
  | 'DRIVER_ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_DRIVER_FOUND';

export type PaymentMethod = 'CARD' | 'CASH' | 'CORPORATE';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

// ─── BOOKING TRACKING ─────────────────────────────────────

export interface BookingTracking {
  id: string;
  bookingId: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  recordedAt: Date;
}

// ─── PAYMENT ──────────────────────────────────────────────

export interface Payment {
  id: string;
  tenantId: string;
  bookingId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  refundId: string | null;
  refundAmount: number | null;
  refundReason: string | null;
  processedAt: Date | null;
  createdAt: Date;
}

// ─── PRICING ──────────────────────────────────────────────

export interface PricingRule {
  id: string;
  tenantId: string;
  zoneId: string | null;
  vehicleType: VehicleType;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
  bookingFee: number;
  nightMultiplier: number;
  nightStartHour: number; // 0-23
  nightEndHour: number; // 0-23
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Zone {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  // GeoJSON polygon coordinates
  polygon: GeoCoordinate[];
  isActive: boolean;
  createdAt: Date;
}

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface SurgePricing {
  id: string;
  tenantId: string;
  zoneId: string | null;
  multiplier: number;
  reason: string;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
}

// ─── RATING ───────────────────────────────────────────────

export interface Rating {
  id: string;
  tenantId: string;
  bookingId: string;
  ratedByUserId: string;
  ratedUserId: string;
  ratingType: RatingType;
  score: number; // 1-5
  comment: string | null;
  createdAt: Date;
}

export type RatingType = 'PASSENGER_RATES_DRIVER' | 'DRIVER_RATES_PASSENGER';

// ─── PROMOTIONS ───────────────────────────────────────────

export interface Promotion {
  id: string;
  tenantId: string;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  minimumFare: number | null;
  maximumDiscount: number | null;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number | null;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  createdAt: Date;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

// ─── CORPORATE ────────────────────────────────────────────

export interface CorporateAccount {
  id: string;
  tenantId: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  creditLimit: number;
  currentBalance: number;
  billingCycle: BillingCycle;
  isActive: boolean;
  createdAt: Date;
}

export type BillingCycle = 'WEEKLY' | 'MONTHLY';

// ─── NOTIFICATIONS ────────────────────────────────────────

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string> | null;
  isRead: boolean;
  sentAt: Date;
  readAt: Date | null;
}

export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ARRIVED'
  | 'RIDE_STARTED'
  | 'RIDE_COMPLETED'
  | 'BOOKING_CANCELLED'
  | 'PAYMENT_RECEIVED'
  | 'DRIVER_APPROVED'
  | 'DRIVER_REJECTED'
  | 'DOCUMENT_EXPIRY'
  | 'PAYOUT_PROCESSED'
  | 'PROMO_CODE'
  | 'GENERAL';

// ─── SUPPORT ──────────────────────────────────────────────

export interface SupportTicket {
  id: string;
  tenantId: string;
  userId: string;
  bookingId: string | null;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// ─── SUBSCRIPTION ─────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string; // 'starter', 'business', 'pro', 'enterprise'
  priceMonthly: number;
  currency: string;
  maxDrivers: number | null; // null = unlimited
  features: string[];
  isActive: boolean;
}

export interface TenantSubscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'TRIALING'
  | 'UNPAID';

// ─── PAYOUT ───────────────────────────────────────────────

export interface Payout {
  id: string;
  tenantId: string;
  driverId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  periodStart: Date;
  periodEnd: Date;
  tripsCount: number;
  stripeTransferId: string | null;
  processedAt: Date | null;
  createdAt: Date;
}

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';

// ─── API REQUEST / RESPONSE TYPES ─────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── AUTH ─────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  expiresIn: number; // seconds
}

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string | null;
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
}

// ─── SOCKET EVENTS ────────────────────────────────────────

export interface SocketEvents {
  // Server → Client
  BOOKING_NEW: { booking: Booking };
  BOOKING_UPDATED: { booking: Booking };
  DRIVER_LOCATION: { driverId: string; latitude: number; longitude: number; heading: number };
  DRIVER_STATUS_CHANGED: { driverId: string; status: DriverOnlineStatus };
  BOOKING_ACCEPTED: { bookingId: string; driver: Driver };
  BOOKING_CANCELLED: { bookingId: string; reason: string };
  RIDE_STARTED: { bookingId: string };
  RIDE_COMPLETED: { bookingId: string; fare: number };
  // Client → Server
  DRIVER_LOCATION_UPDATE: { latitude: number; longitude: number; heading: number; speed: number };
  JOIN_BOOKING_ROOM: { bookingId: string };
  LEAVE_BOOKING_ROOM: { bookingId: string };
}

// ─── DRIVER DOCUMENTS ─────────────────────────────────────

export interface DriverDocument {
  id: string;
  tenantId: string;
  driverId: string;
  type: DocumentType;
  fileUrl: string;
  expiryDate: Date | null;
  status: DocumentStatus;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  uploadedAt: Date;
}

export type DocumentType =
  | 'DRIVING_LICENSE'
  | 'INSURANCE'
  | 'DBS_CHECK'
  | 'VEHICLE_REGISTRATION'
  | 'MOT_CERTIFICATE'
  | 'PROFILE_PHOTO'
  | 'VEHICLE_PHOTO';

export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

// ─── TENANT API KEYS ──────────────────────────────────────

export interface TenantApiKey {
  id: string;
  tenantId: string;
  provider: ApiKeyProvider;
  // Keys are NEVER returned in full from API — masked only
  keyMasked: string;
  isConfigured: boolean;
  updatedAt: Date;
}

export type ApiKeyProvider =
  | 'GOOGLE_MAPS'
  | 'TWILIO_ACCOUNT_SID'
  | 'TWILIO_AUTH_TOKEN'
  | 'STRIPE_PUBLISHABLE'
  | 'STRIPE_SECRET';

// ─── FARE ESTIMATE ────────────────────────────────────────

export interface FareEstimate {
  vehicleType: VehicleType;
  estimatedFare: number;
  currency: string;
  distanceKm: number;
  durationMinutes: number;
  breakdown: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    bookingFee: number;
    surgeMultiplier: number;
    discount: number;
  };
}

// ─── DASHBOARD STATS ──────────────────────────────────────

export interface DashboardStats {
  tenantId: string;
  date: string;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  activeDrivers: number;
  onlineDrivers: number;
  newPassengers: number;
  averageRating: number;
  currency: string;
}
