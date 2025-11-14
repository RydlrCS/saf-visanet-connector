/**
 * TypeScript definitions for X-Pay-Token Configuration
 */

/**
 * X-Pay-Token signature result
 */
export interface XPaySignature {
  signature: string;
  timestamp: string;
}

/**
 * X-Pay-Token headers
 */
export interface XPayHeaders {
  'x-pay-token': string;
  'x-client-transaction-id': string;
}

/**
 * X-Pay-Token Configuration Class
 */
export default class XPayTokenConfig {
  apiKey: string;
  publicKeyPath: string;
  privateKeyPath: string;
  publicKey: string;
  privateKey: string;

  constructor();

  /**
   * Validate required X-Pay-Token configuration
   */
  validateConfig(): void;

  /**
   * Load RSA keys for X-Pay-Token authentication
   */
  loadKeys(): void;

  /**
   * Generate new RSA-2048 key pair for X-Pay-Token
   */
  generateKeyPair(): void;

  /**
   * Generate X-Pay-Token header for API request
   */
  generateXPayToken(
    resourcePath: string,
    queryString?: string,
    requestBody?: string
  ): string;

  /**
   * Validate X-Pay-Token from incoming webhook or response
   */
  validateXPayToken(
    xPayToken: string,
    resourcePath: string,
    queryString?: string,
    requestBody?: string
  ): boolean;

  /**
   * Get complete headers for Visa API request
   */
  getHeaders(
    resourcePath: string,
    queryString?: string,
    requestBody?: string
  ): XPayHeaders;

  /**
   * Get public key in PEM format for Visa registration
   */
  getPublicKeyPEM(): string;
}
