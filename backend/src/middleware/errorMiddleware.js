"use strict";
// ============================================================
// middleware/errorMiddleware.ts — Global error handler
// Catches all errors, formats consistent API responses
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = errorMiddleware;
exports.notFoundMiddleware = notFoundMiddleware;
const zod_1 = require("zod");
const logger_1 = require("../config/logger");
const shared_constants_1 = require("@taxiflow/shared-constants");
const ApiError_1 = require("../utils/ApiError");
const logger = (0, logger_1.createModuleLogger)('error-handler');
function errorMiddleware(error, req, res, _next) {
    // Zod validation errors
    if (error instanceof zod_1.ZodError) {
        const formattedErrors = error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
        }));
        res.status(shared_constants_1.HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            error: 'Validation failed',
            code: shared_constants_1.ERROR_CODES.VALIDATION_ERROR,
            statusCode: shared_constants_1.HTTP_STATUS.BAD_REQUEST,
            details: formattedErrors,
        });
        return;
    }
    // Known API errors
    if (error instanceof ApiError_1.ApiError) {
        if (error.statusCode >= 500) {
            logger.error('API Error', {
                message: error.message,
                code: error.code,
                path: req.path,
                method: req.method,
                tenantId: req.tenantId,
                userId: req.user?.id,
            });
        }
        else {
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
        const prismaError = error;
        if (prismaError.code === 'P2002') {
            // Unique constraint violation
            const field = prismaError.meta?.target?.[0] ?? 'field';
            res.status(shared_constants_1.HTTP_STATUS.CONFLICT).json({
                success: false,
                error: `A record with this ${field} already exists`,
                code: shared_constants_1.ERROR_CODES.VALIDATION_ERROR,
                statusCode: shared_constants_1.HTTP_STATUS.CONFLICT,
            });
            return;
        }
        if (prismaError.code === 'P2025') {
            // Record not found
            res.status(shared_constants_1.HTTP_STATUS.NOT_FOUND).json({
                success: false,
                error: 'Record not found',
                code: shared_constants_1.ERROR_CODES.NOT_FOUND,
                statusCode: shared_constants_1.HTTP_STATUS.NOT_FOUND,
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
    res.status(shared_constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'An unexpected error occurred',
        code: shared_constants_1.ERROR_CODES.INTERNAL_ERROR,
        statusCode: shared_constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR,
    });
}
function notFoundMiddleware(req, res) {
    res.status(shared_constants_1.HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: `Route ${req.method} ${req.path} not found`,
        code: shared_constants_1.ERROR_CODES.NOT_FOUND,
        statusCode: shared_constants_1.HTTP_STATUS.NOT_FOUND,
    });
}
//# sourceMappingURL=errorMiddleware.js.map