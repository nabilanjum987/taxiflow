export declare function createTicket(input: {
    tenantId: string;
    userId: string;
    subject: string;
    description: string;
    bookingId?: string;
    priority?: string;
}): Promise<any>;
export declare function getTickets(tenantId: string, page: number, limit: number, status?: string): Promise<{
    tickets: any;
    pagination: {
        total: any;
        page: number;
        limit: number;
        skip: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}>;
export declare function updateTicketStatus(ticketId: string, tenantId: string, status: string, assignedTo?: string): Promise<any>;
//# sourceMappingURL=support.service.d.ts.map