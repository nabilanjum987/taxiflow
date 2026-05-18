"use strict";
// ============================================================
// config/logger.ts — Winston logger
// NEVER use console.log — always use this logger
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createModuleLogger = createModuleLogger;
const winston_1 = __importDefault(require("winston"));
const env_1 = require("./env");
const { combine, timestamp, errors, json, colorize, simple, printf } = winston_1.default.format;
const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${String(ts)} [${level}]: ${String(message)}${metaStr}`;
});
const productionTransports = [
    new winston_1.default.transports.Console({
        format: combine(timestamp(), errors({ stack: true }), json()),
    }),
];
const developmentTransports = [
    new winston_1.default.transports.Console({
        format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), devFormat),
    }),
    new winston_1.default.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: combine(timestamp(), errors({ stack: true }), json()),
    }),
    new winston_1.default.transports.File({
        filename: 'logs/combined.log',
        format: combine(timestamp(), errors({ stack: true }), json()),
    }),
];
exports.logger = winston_1.default.createLogger({
    level: env_1.env.LOG_LEVEL,
    format: combine(errors({ stack: true }), json()),
    defaultMeta: { service: 'taxiflow-backend' },
    transports: env_1.env.NODE_ENV === 'production' ? productionTransports : developmentTransports,
    // Catch unhandled exceptions
    exceptionHandlers: [
        new winston_1.default.transports.File({ filename: 'logs/exceptions.log' }),
    ],
    rejectionHandlers: [
        new winston_1.default.transports.File({ filename: 'logs/rejections.log' }),
    ],
});
// Helper to create module-specific child loggers
function createModuleLogger(module) {
    return exports.logger.child({ module });
}
//# sourceMappingURL=logger.js.map