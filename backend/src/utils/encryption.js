"use strict";
// ============================================================
// utils/encryption.ts — AES-256-GCM encryption
// agent.md: All API keys encrypted at rest (AES-256)
// Used ONLY for storing client API keys in database
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptApiKey = encryptApiKey;
exports.decryptApiKey = decryptApiKey;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
const shared_constants_1 = require("@taxiflow/shared-constants");
/**
 * Encrypts a plain text value (API key) for database storage
 * Uses AES-256-GCM — provides both encryption and authentication
 */
function encryptApiKey(plainText) {
    const key = Buffer.from(env_1.env.ENCRYPTION_KEY, 'hex');
    const iv = crypto_1.default.randomBytes(shared_constants_1.ENCRYPTION.IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(shared_constants_1.ENCRYPTION.ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plainText, 'utf8'),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return {
        encryptedKey: encrypted.toString('hex'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
    };
}
/**
 * Decrypts a stored encrypted API key
 */
function decryptApiKey(encrypted) {
    const key = Buffer.from(env_1.env.ENCRYPTION_KEY, 'hex');
    const iv = Buffer.from(encrypted.iv, 'hex');
    const authTag = Buffer.from(encrypted.authTag, 'hex');
    const encryptedBuffer = Buffer.from(encrypted.encryptedKey, 'hex');
    const decipher = crypto_1.default.createDecipheriv(shared_constants_1.ENCRYPTION.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final(),
    ]);
    return decrypted.toString('utf8');
}
//# sourceMappingURL=encryption.js.map