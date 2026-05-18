// modules/support/support.service.ts
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { createModuleLogger } from '../../config/logger';
import { ERROR_CODES, HTTP_STATUS } from '@taxiflow/shared-constants';
import { buildPagination } from '@taxiflow/shared-utils';
import { ApiError } from '../../utils/ApiError';

const logger = createModuleLogger('support-service');

export async function createTicket(input: {
  tenantId: string; userId: string; subject: string;
  description: string; bookingId?: string; priority?: string;
}) {
  return prisma.supportTicket.create({
    data: {
      id: uuidv4(),
      tenantId: input.tenantId,
      userId: input.userId,
      subject: input.subject,
      description: input.description,
      bookingId: input.bookingId ?? null,
      priority: (input.priority as never) ?? 'MEDIUM',
    },
  });
}

export async function getTickets(tenantId: string, page: number, limit: number, status?: string) {
  const pagination = buildPagination(page, limit);
  const where = { tenantId, ...(status && { status: status as never }) };
  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
    }),
    prisma.supportTicket.count({ where }),
  ]);
  return { tickets, pagination: { ...pagination, total } };
}

export async function updateTicketStatus(ticketId: string, tenantId: string, status: string, assignedTo?: string) {
  const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId, tenantId } });
  if (!ticket) throw new ApiError('Ticket not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  return prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: status as never,
      ...(assignedTo && { assignedTo }),
      ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
    },
  });
}
