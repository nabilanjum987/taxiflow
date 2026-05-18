// ============================================================
// middleware/errorMiddleware.ts — Global error handler
// Catches all errors, formats consistent API responses
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createModuleLogger } from '../config/logger';
import { HTTP_STATUS, ERROR_CODES } from '@taxiflow/shared-constants';
import { ApiError } from '../utils/ApiError';

const logger = createModuleLogger('error-handler');

export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors
  if (error instanceof ZodError) {
    const formattedErrors = error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'Validation failed',
      code: ERROR_CODES.VALIDATION_ERROR,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      details: formattedErrors,
    });
    return;
  }

  // Known API errors
  if (error instanceof ApiError) {
    if (error.statusCode >= 500) {
      logger.error('API Error', {
        message: error.message,
        code: error.code,
        path: req.path,
        method: req.method,
        tenantId: req.tenantId,
        userId: req.user?.id,
      });
    } else {
      logger.warn('Client error', {
        message: error.message,
        code: error.code,
        path: req.path,
        statusCode: error.statusCode,
      });
    }

    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    });
    return;
  }

  // Prisma errors
  if (error.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as { code: string; meta?: { target?: string[] } };

    if (prismaError.code === 'P2002') {
      // Unique constraint violation
      const field = prismaError.meta?.target?.[0] ?? 'field';
      res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: `A record with this ${field} already exists`,
        code: ERROR_CODES.VALIDATION_ERROR,
        statusCode: HTTP_STATUS.CONFLICT,
      });
      return;
    }

    if (prismaError.code === 'P2025') {
      // Record not found
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Record not found',
        code: ERROR_CODES.NOT_FOUND,
        statusCode: HTTP_STATUS.NOT_FOUND,
      });
      return;
    }
  }

  // Unhandled errors — log full details, return generic message
  logger.error('Unhandled error', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    tenantId: req.tenantId,
    userId: req.user?.id,
  });

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: 'An unexpected error occurred',
    code: ERROR_CODES.INTERNAL_ERROR,
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  });
}

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    code: ERROR_CODES.NOT_FOUND,
    statusCode: HTTP_STATUS.NOT_FOUND,
  });
}
