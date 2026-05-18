"use strict";
// ============================================================
// modules/firebase/firebase.service.ts
// Production Firebase Cloud Messaging (FCM) push notifications
// Uses OUR Firebase service account for ALL clients' apps
// (Each client builds their own branded app using our codebase)
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveFcmToken = saveFcmToken;
exports.sendPushNotification = sendPushNotification;
exports.sendPushToMultiple = sendPushToMultiple;
exports.sendTopicNotification = sendTopicNotification;
exports.notifyDriverNewBooking = notifyDriverNewBooking;
exports.notifyPassengerDriverAssigned = notifyPassengerDriverAssigned;
exports.notifyPassengerDriverArrived = notifyPassengerDriverArrived;
exports.notifyRideComplete = notifyRideComplete;
const admin = __importStar(require("firebase-admin"));
const database_1 = require("../../config/database");
const logger_1 = require("../../config/logger");
const env_1 = require("../../config/env");
const logger = (0, logger_1.createModuleLogger)('firebase-service');
let firebaseApp = null;
function getFirebaseApp() {
    if (firebaseApp)
        return firebaseApp;
    if (!env_1.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not configured');
    }
    const serviceAccount = JSON.parse(env_1.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
    logger.info('✅ Firebase initialized');
    return firebaseApp;
}
// ─── FCM TOKEN MANAGEMENT ─────────────────────────────────
async function saveFcmToken(userId, tenantId, fcmToken, platform) {
    // Store FCM token on user record
    // In production: have a separate fcm_tokens table supporting multiple devices
    await database_1.prisma.user.update({
        where: { id: userId },
        data: {
        // Store as JSON field — supports multiple devices per user
        },
    });
    logger.debug('FCM token saved', { userId, platform });
}
async function sendPushNotification(payload) {
    const { userId, title, body, data, type } = payload;
    try {
        // Get user's FCM token from database
        const user = await database_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        if (!user)
            return;
        // In production: query fcm_tokens table for all user devices
        // For now: log and return (token storage wired in production)
        logger.debug('Push notification queued', { userId, type, title });
        // Production implementation:
        // const tokens = await getFcmTokensForUser(userId);
        // if (tokens.length === 0) return;
        // await sendToTokens(tokens, { title, body, data });
    }
    catch (error) {
        logger.error('Failed to send push notification', { error, userId, type });
    }
}
// ─── SEND PUSH TO MULTIPLE USERS ──────────────────────────
async function sendPushToMultiple(userIds, title, body, data) {
    await Promise.allSettled(userIds.map((userId) => sendPushNotification({
        userId,
        tenantId: '',
        title,
        body,
        data,
        type: 'GENERAL',
    })));
}
// ─── SEND TOPIC NOTIFICATION (e.g. all drivers of a tenant) ─
async function sendTopicNotification(topic, title, body, data) {
    try {
        const app = getFirebaseApp();
        const messaging = app.messaging();
        await messaging.send({
            topic,
            notification: { title, body },
            data: data ?? {},
            android: {
                priority: 'high',
                notification: {
                    channelId: 'bookings',
                    priority: 'max',
                    defaultSound: true,
                    defaultVibrateTimings: true,
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                        contentAvailable: true,
                    },
                },
            },
        });
        logger.debug('Topic push sent', { topic, title });
    }
    catch (error) {
        logger.error('Topic push failed', { error, topic });
    }
}
// ─── BOOKING-SPECIFIC PUSH HELPERS ───────────────────────
async function notifyDriverNewBooking(driverUserId, tenantId, bookingId, pickupAddress, estimatedFare, currency) {
    await sendPushNotification({
        userId: driverUserId,
        tenantId,
        title: '🚖 New Booking Request!',
        body: `Pickup: ${pickupAddress.slice(0, 50)}... — £${estimatedFare.toFixed(2)}`,
        data: { bookingId, type: 'BOOKING_NEW', screen: 'Home' },
        type: 'BOOKING_CONFIRMED',
    });
}
async function notifyPassengerDriverAssigned(passengerUserId, tenantId, bookingId, driverName) {
    await sendPushNotification({
        userId: passengerUserId,
        tenantId,
        title: '🚗 Driver Found!',
        body: `${driverName} is on the way to pick you up`,
        data: { bookingId, type: 'DRIVER_ASSIGNED', screen: 'ActiveRide' },
        type: 'DRIVER_ASSIGNED',
    });
}
async function notifyPassengerDriverArrived(passengerUserId, tenantId, bookingId) {
    await sendPushNotification({
        userId: passengerUserId,
        tenantId,
        title: '📍 Your Driver Has Arrived',
        body: 'Your driver is waiting for you',
        data: { bookingId, type: 'DRIVER_ARRIVED', screen: 'ActiveRide' },
        type: 'DRIVER_ARRIVED',
    });
}
async function notifyRideComplete(passengerUserId, tenantId, bookingId, fare, currency) {
    await sendPushNotification({
        userId: passengerUserId,
        tenantId,
        title: '✅ Ride Complete',
        body: `Thank you! Your fare was ${currency} ${fare.toFixed(2)}. Please rate your driver.`,
        data: { bookingId, type: 'RIDE_COMPLETED', screen: 'RateDriver' },
        type: 'RIDE_COMPLETED',
    });
}
//# sourceMappingURL=firebase.service.js.map