"use strict";
// ============================================================
// utils/responseHelpers.ts — Consistent API response format
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendCreated = sendCreated;
exports.sendNoContent = sendNoContent;
exports.sendPaginated = sendPaginated;
const shared_constants_1 = require("@taxiflow/shared-constants");
function sendSuccess(res, data, message, statusCode = shared_constants_1.HTTP_STATUS.OK) {
    res.status(statusCode).json({
        success: true,
        data,
        ...(message && { message }),
    });
}
function sendCreated(res, data, message) {
    sendSuccess(res, data, message, shared_constants_1.HTTP_STATUS.CREATED);
}
function sendNoContent(res) {
    res.status(shared_constants_1.HTTP_STATUS.NO_CONTENT).send();
}
function sendPaginated(res, data, pagination) {
    res.status(shared_constants_1.HTTP_STATUS.OK).json({
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
//# sourceMappingURL=responseHelpers.js.map