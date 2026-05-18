export declare function getUserNotifications(userId: string, tenantId: string, page: number, limit: number, unreadOnly?: boolean): Promise<{
    notifications: any;
    pagination: {
        total: any;
        page: number;
        limit: number;
        skip: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    unreadCount: any;
}>;
export declare function markAsRead(notificationId: string, userId: string, tenantId: string): Promise<any>;
export declare function markAllAsRead(userId: string, tenantId: string): Promise<{
    updated: any;
}>;
export declare function getUnreadCount(userId: string, tenantId: string): Promise<{
    unreadCount: any;
}>;
//# sourceMappingURL=notifications.service.d.ts.map