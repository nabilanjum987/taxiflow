// ============================================================
// utils/encryption.ts — AES-256-GCM encryption
// agent.md: All API keys encrypted at rest (AES-256)
// Used ONLY for storing client API keys in database
// ============================================================

import crypto from 'crypto';
import { env } from '../config/env';
import { ENCRYPTION } from '@taxiflow/shared-constants';

interface EncryptedData {
  encryptedKey: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypts a plain text value (API key) for database storage
 * Uses AES-256-GCM — provides both encryption and authentication
 */
export function encryptApiKey(plainText: string): EncryptedData {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(ENCRYPTION.IV_LENGTH);

  const cipher = crypto.createCipheriv(ENCRYPTION.ALGORITHM, key, iv);

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
export function decryptApiKey(encrypted: EncryptedData): string {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(encrypted.iv, 'hex');
  const authTag = Buffer.from(encrypted.authTag, 'hex');
  const encryptedBuffer = Buffer.from(encrypted.encryptedKey, 'hex');

  const decipher = crypto.createDecipheriv(ENCRYPTION.ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedBuffer),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
