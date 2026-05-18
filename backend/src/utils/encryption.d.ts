interface EncryptedData {
    encryptedKey: string;
    iv: string;
    authTag: string;
}
/**
 * Encrypts a plain text value (API key) for database storage
 * Uses AES-256-GCM — provides both encryption and authentication
 */
export declare function encryptApiKey(plainText: string): EncryptedData;
/**
 * Decrypts a stored encrypted API key
 */
export declare function decryptApiKey(encrypted: EncryptedData): string;
export {};
//# sourceMappingURL=encryption.d.ts.map