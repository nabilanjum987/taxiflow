import Bull from 'bull';
export declare const notificationQueue: Bull.Queue<any>;
export declare const emailQueue: Bull.Queue<any>;
export declare const smsQueue: Bull.Queue<any>;
export declare const payoutQueue: Bull.Queue<any>;
export declare const bookingTimeoutQueue: Bull.Queue<any>;
export interface NotificationJobData {
    tenantId: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    fcmToken?: string;
}
export interface EmailJobData {
    to: string;
    subject: string;
    template: string;
    variables: Record<string, string | number | boolean>;
    tenantId?: string;
}
export interface SmsJobData {
    tenantId: string;
    to: string;
    message: string;
}
export interface PayoutJobData {
    tenantId: string;
    driverId: string;
    periodStart: Date;
    periodEnd: Date;
}
export interface BookingTimeoutJobData {
    bookingId: string;
    tenantId: string;
    driverUserId: string;
}
export declare function addNotificationJob(data: NotificationJobData): Promise<void>;
export declare function addEmailJob(data: EmailJobData): Promise<void>;
export declare function addSmsJob(data: SmsJobData): Promise<void>;
export declare function addPayoutJob(data: PayoutJobData): Promise<void>;
export declare function addBookingTimeoutJob(data: BookingTimeoutJobData, delayMs: number): Promise<Bull.Job<BookingTimeoutJobData>>;
export declare function closeQueues(): Promise<void>;
//# sourceMappingURL=queues.d.ts.map