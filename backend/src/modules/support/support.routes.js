"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// modules/support/support.routes.ts
const express_1 = require("express");
const zod_1 = require("zod");
const supportService = __importStar(require("./support.service"));
const authMiddleware_1 = require("../../middleware/authMiddleware");
const responseHelpers_1 = require("../../utils/responseHelpers");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
router.post('/', async (req, res, next) => {
    try {
        const input = zod_1.z.object({
            subject: zod_1.z.string().min(1).max(200),
            description: zod_1.z.string().min(1).max(2000),
            bookingId: zod_1.z.string().uuid().optional(),
            priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        }).parse(req.body);
        const ticket = await supportService.createTicket({ tenantId: req.tenantId, userId: req.user.id, ...input });
        (0, responseHelpers_1.sendCreated)(res, ticket, 'Support ticket created');
    }
    catch (e) {
        next(e);
    }
});
router.get('/', (0, authMiddleware_1.authorize)('TENANT_ADMIN', 'DISPATCHER'), async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const result = await supportService.getTickets(req.tenantId, page, limit, status);
        (0, responseHelpers_1.sendPaginated)(res, result.tickets, result.pagination);
    }
    catch (e) {
        next(e);
    }
});
router.patch('/:id/status', (0, authMiddleware_1.authorize)('TENANT_ADMIN', 'DISPATCHER'), async (req, res, next) => {
    try {
        const { status, assignedTo } = zod_1.z.object({
            status: zod_1.z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
            assignedTo: zod_1.z.string().optional(),
        }).parse(req.body);
        const ticket = await supportService.updateTicketStatus(req.params.id, req.tenantId, status, assignedTo);
        (0, responseHelpers_1.sendSuccess)(res, ticket, 'Ticket updated');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=support.routes.js.map