// ============================================================
// utils/responseHelpers.ts — Consistent API response format
// ============================================================

import { Response } from 'express';
import { HTTP_STATUS } from '@taxiflow/shared-constants';
import type { PaginationMeta } from '@taxiflow/shared-utils';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = HTTP_STATUS.OK,
): void {
  res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message }),
  });
}

export function sendCreated<T>(res: Response, data: T, message?: string): void {
  sendSuccess(res, data, message, HTTP_STATUS.CREATED);
}

export function sendNoContent(res: Response): void {
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
): void {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasNext: pagination.hasNext,
      hasPrev: pagination.hasPrev,
    },
  });
}
