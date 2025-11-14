/**
 * TypeScript definitions for Visa SSL Configuration
 */

import https from 'https';

/**
 * SSL configuration options
 */
export interface SSLConfigOptions {
  userId: string;
  password: string;
  certPath: string;
  keyPath: string;
  caPath: string;
}

/**
 * Certificate expiry information
 */
export interface CertificateExpiryInfo {
  notBefore: Date;
  notAfter: Date;
  daysUntilExpiry: number;
  isExpired: boolean;
  expiringSoon: boolean;
}

/**
 * Axios configuration object
 */
export interface AxiosConfig {
  httpsAgent: https.Agent;
  headers: {
    Authorization: string;
    Accept: string;
    'Content-Type': string;
  };
  timeout: number;
}

/**
 * Visa SSL Configuration Class
 */
export default class VisaSSLConfig {
  userId: string;
  password: string;
  certPath: string;
  keyPath: string;
  caPath: string;
  cert: Buffer;
  key: Buffer;
  ca: Buffer;

  constructor();

  /**
   * Validate required SSL configuration parameters
   */
  validateConfig(): void;

  /**
   * Load SSL certificates from file system
   */
  loadCertificates(): void;

  /**
   * Get Basic Authentication header for Visa API
   */
  getAuthHeader(): string;

  /**
   * Get HTTPS agent configured for mutual TLS authentication
   */
  getHttpsAgent(): https.Agent;

  /**
   * Get Axios configuration with SSL and authentication
   */
  getAxiosConfig(): AxiosConfig;

  /**
   * Check if SSL certificate is expired or expiring soon
   */
  checkCertificateExpiry(): CertificateExpiryInfo;
}
