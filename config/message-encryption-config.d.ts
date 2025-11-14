/**
 * TypeScript definitions for Message Encryption Configuration
 */

/**
 * Encryption headers
 */
export interface EncryptionHeaders {
  'x-encryption-key-id': string;
  'content-type': string;
}

/**
 * Message Encryption Configuration Class
 */
export default class MessageEncryptionConfig {
  keyId: string;
  encryptionCertPath: string;
  decryptionKeyPath: string;
  keystore: any;
  encryptionKey: any;
  decryptionKey: any;

  constructor();

  /**
   * Validate required encryption configuration
   */
  validateConfig(): void;

  /**
   * Initialize JWE key store with encryption and decryption keys
   */
  initializeKeyStore(): Promise<void>;

  /**
   * Encrypt sensitive payload using JWE (JSON Web Encryption)
   */
  encryptPayload(payload: Record<string, any>): Promise<string>;

  /**
   * Decrypt JWE encrypted payload from Visa API response
   */
  decryptPayload(encryptedPayload: string): Promise<Record<string, any>>;

  /**
   * Encrypt only specific sensitive fields in a request object
   */
  encryptSensitiveFields(
    request: Record<string, any>,
    sensitiveFields?: string[]
  ): Promise<Record<string, any>>;

  /**
   * Get HTTP headers required for encrypted requests
   */
  getEncryptionHeaders(): EncryptionHeaders;

  /**
   * Check if message encryption is enabled
   */
  isEnabled(): boolean;
}
