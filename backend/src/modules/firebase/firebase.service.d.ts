import type { NotificationType } from '@taxiflow/shared-types';
export declare function saveFcmToken(userId: string, tenantId: string, fcmToken: string, platform: 'ios' | 'android'): Promise<void>;
export interface PushNotificationPayload {
    userId: string;
    tenantId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    type: NotificationType;
}
export declare function sendPushNotification(payload: PushNotificationPayload): Promise<void>;
export declare function sendPushToMultiple(userIds: string[], title: string, body: string, data?: Record<string, string>): Promise<void>;
export declare function sendTopicNotification(topic: string, title: string, body: string, data?: Record<string, string>): Promise<void>;
export declare function notifyDriverNewBooking(driverUserId: string, tenantId: string, bookingId: string, pickupAddress: string, estimatedFare: number, currency: string): Promise<void>;
export declare function notifyPassengerDriverAssigned(passengerUserId: string, tenantId: string, bookingId: string, driverName: string): Promise<void>;
export declare function notifyPassengerDriverArrived(passengerUserId: string, tenantId: string, bookingId: string): Promise<void>;
export declare function notifyRideComplete(passengerUserId: string, tenantId: string, bookingId: string, fare: number, currency: string): Promise<void>;
//# sourceMappingURL=firebase.service.d.ts.map