// ============================================================
// config/logger.ts — Winston logger
// NEVER use console.log — always use this logger
// ============================================================

import winston from 'winston';
import { env } from './env';

const { combine, timestamp, errors, json, colorize, simple, printf } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `${String(ts)} [${level}]: ${String(message)}${metaStr}`;
});

const productionTransports: winston.transport[] = [
  new winston.transports.Console({
    format: combine(timestamp(), errors({ stack: true }), json()),
  }),
];

const developmentTransports: winston.transport[] = [
  new winston.transports.Console({
    format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), devFormat),
  }),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: combine(timestamp(), errors({ stack: true }), json()),
  }),
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: combine(timestamp(), errors({ stack: true }), json()),
  }),
];

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(errors({ stack: true }), json()),
  defaultMeta: { service: 'taxiflow-backend' },
  transports: env.NODE_ENV === 'production' ? productionTransports : developmentTransports,
  // Catch unhandled exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Helper to create module-specific child loggers
export function createModuleLogger(module: string): winston.Logger {
  return logger.child({ module });
}
