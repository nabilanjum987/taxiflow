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
// modules/notifications/notifications.routes.ts
const express_1 = require("express");
const notificationsService = __importStar(require("./notifications.service"));
const authMiddleware_1 = require("../../middleware/authMiddleware");
const responseHelpers_1 = require("../../utils/responseHelpers");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const unreadOnly = req.query.unread === 'true';
        const result = await notificationsService.getUserNotifications(req.user.id, req.tenantId, page, limit, unreadOnly);
        (0, responseHelpers_1.sendPaginated)(res, result.notifications, result.pagination);
    }
    catch (e) {
        next(e);
    }
});
router.get('/unread-count', async (req, res, next) => {
    try {
        const count = await notificationsService.getUnreadCount(req.user.id, req.tenantId);
        (0, responseHelpers_1.sendSuccess)(res, count);
    }
    catch (e) {
        next(e);
    }
});
router.patch('/:id/read', async (req, res, next) => {
    try {
        const notification = await notificationsService.markAsRead(req.params.id, req.user.id, req.tenantId);
        (0, responseHelpers_1.sendSuccess)(res, notification);
    }
    catch (e) {
        next(e);
    }
});
router.patch('/read-all', async (req, res, next) => {
    try {
        const result = await notificationsService.markAllAsRead(req.user.id, req.tenantId);
        (0, responseHelpers_1.sendSuccess)(res, result, 'All notifications marked as read');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=notifications.routes.js.map