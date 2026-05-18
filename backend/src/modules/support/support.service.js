"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTicket = createTicket;
exports.getTickets = getTickets;
exports.updateTicketStatus = updateTicketStatus;
// modules/support/support.service.ts
const uuid_1 = require("uuid");
const database_1 = require("../../config/database");
const logger_1 = require("../../config/logger");
const shared_constants_1 = require("@taxiflow/shared-constants");
const shared_utils_1 = require("@taxiflow/shared-utils");
const ApiError_1 = require("../../utils/ApiError");
const logger = (0, logger_1.createModuleLogger)('support-service');
async function createTicket(input) {
    return database_1.prisma.supportTicket.create({
        data: {
            id: (0, uuid_1.v4)(),
            tenantId: input.tenantId,
            userId: input.userId,
            subject: input.subject,
            description: input.description,
            bookingId: input.bookingId ?? null,
            priority: input.priority ?? 'MEDIUM',
        },
    });
}
async function getTickets(tenantId, page, limit, status) {
    const pagination = (0, shared_utils_1.buildPagination)(page, limit);
    const where = { tenantId, ...(status && { status: status }) };
    const [tickets, total] = await Promise.all([
        database_1.prisma.supportTicket.findMany({
            where,
            skip: pagination.skip,
            take: pagination.limit,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
        }),
        database_1.prisma.supportTicket.count({ where }),
    ]);
    return { tickets, pagination: { ...pagination, total } };
}
async function updateTicketStatus(ticketId, tenantId, status, assignedTo) {
    const ticket = await database_1.prisma.supportTicket.findFirst({ where: { id: ticketId, tenantId } });
    if (!ticket)
        throw new ApiError_1.ApiError('Ticket not found', shared_constants_1.HTTP_STATUS.NOT_FOUND, shared_constants_1.ERROR_CODES.NOT_FOUND);
    return database_1.prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
            status: status,
            ...(assignedTo && { assignedTo }),
            ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
        },
    });
}
//# sourceMappingURL=support.service.js.map