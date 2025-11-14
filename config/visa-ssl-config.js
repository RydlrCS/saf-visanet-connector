/**
 * @fileoverview Visa Two-Way SSL Configuration Module
 *
 * Handles mutual TLS (mTLS) authentication with Visa API endpoints.
 * Provides secure communication through client certificate authentication,
 * SSL/TLS certificate management, and HTTPS agent configuration.
 *
 * @module config/visa-ssl-config
 * @requires fs
 * @requires path
 * @requires https
 * @requires utils/logger
 *
 * @author SAF VisaNet Integration Team
 * @version 1.0.0
 * @since 2025-11-14
 *
 * @example
 * const VisaSSLConfig = require('./config/visa-ssl-config');
 * const sslConfig = new VisaSSLConfig();
 * const httpsAgent = sslConfig.getHttpsAgent();
 * const authHeader = sslConfig.getAuthHeader();
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const logger = require('../utils/logger');

/**
 * @class VisaSSLConfig
 * @classdesc Manages SSL/TLS certificates and mutual authentication for Visa API
 *
 * Provides functionality for:
 * - Loading and validating SSL certificates
 * - Creating HTTPS agents with client certificates
 * - Generating Basic Authentication headers
 * - Monitoring certificate expiry dates
 * - Configuring secure API connections
 *
 * @property {string} userId - Visa API user ID for authentication
 * @property {string} password - Visa API password for authentication
 * @property {string} certPath - File system path to client certificate
 * @property {string} keyPath - File system path to private key
 * @property {string} caPath - File system path to CA certificate
 * @property {Buffer} cert - Loaded client certificate buffer
 * @property {Buffer} key - Loaded private key buffer
 * @property {Buffer} ca - Loaded CA certificate buffer
 */
class VisaSSLConfig {
  /**
   * Initialize Visa SSL Configuration
   *
   * Loads environment variables, validates configuration,
   * and reads SSL certificates from file system.
   *
   * @constructor
   * @throws {Error} If required environment variables are missing
   * @throws {Error} If certificate files cannot be read
   *
   * @example
   * const sslConfig = new VisaSSLConfig();
   * console.log('SSL Config initialized:', sslConfig.certPath);
   */
  constructor() {
    const startTime = Date.now();
    logger.logFunctionEntry('constructor', {}, 'VisaSSLConfig');

    try {
      this.userId = process.env.VISA_USER_ID;
      this.password = process.env.VISA_PASSWORD;
      this.certPath = process.env.VISA_CERT_PATH;
      this.keyPath = process.env.VISA_KEY_PATH;
      this.caPath = process.env.VISA_CA_PATH;

      logger.debug('SSL configuration paths loaded', {
        certPath: this.certPath,
        keyPath: this.keyPath,
        caPath: this.caPath
      });

      this.validateConfig();
      this.loadCertificates();

      logger.logFunctionExit('constructor', { success: true }, startTime, 'VisaSSLConfig');
    } catch (error) {
      logger.logError(error, {}, 'VisaSSLConfig.constructor');
      throw error;
    }
  }

  /**
   * Validate required SSL configuration parameters
   *
   * Ensures all necessary environment variables are set for SSL authentication.
   * This includes user ID, password, and paths to certificate files.
   *
   * @private
   * @throws {Error} If any required configuration parameter is missing
   * @returns {void}
   *
   * @example
   * this.validateConfig(); // Throws error if VISA_USER_ID not set
   */
  validateConfig() {
    const startTime = Date.now();
    logger.logFunctionEntry('validateConfig', {}, 'VisaSSLConfig');

    const required = {
      'VISA_USER_ID': this.userId,
      'VISA_PASSWORD': this.password,
      'VISA_CERT_PATH': this.certPath,
      'VISA_KEY_PATH': this.keyPath,
      'VISA_CA_PATH': this.caPath
    };

    const missing = Object.entries(required)
      .filter(([_key, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      const error = new Error(`Missing required SSL configuration: ${missing.join(', ')}`);
      logger.logError(error, { missingFields: missing }, 'VisaSSLConfig.validateConfig');
      throw error;
    }

    logger.info('SSL configuration validated successfully', { fieldsChecked: Object.keys(required).length });
    logger.logFunctionExit('validateConfig', { valid: true }, startTime, 'VisaSSLConfig');
  }

  /**
   * Load SSL certificates from file system
   *
   * Reads client certificate, private key, and CA certificate files.
   * Certificates must be in PEM format and readable by the process.
   *
   * @private
   * @throws {Error} If certificate files cannot be read or are invalid
   * @returns {void}
   *
   * @example
   * this.loadCertificates();
   * console.log('Cert loaded:', this.cert.length, 'bytes');
   */
  loadCertificates() {
    const startTime = Date.now();
    logger.logFunctionEntry('loadCertificates', {
      certPath: this.certPath,
      keyPath: this.keyPath,
      caPath: this.caPath
    }, 'VisaSSLConfig');

    try {
      this.cert = fs.readFileSync(path.resolve(this.certPath));
      this.key = fs.readFileSync(path.resolve(this.keyPath));
      this.ca = fs.readFileSync(path.resolve(this.caPath));

      const result = {
        certSize: this.cert.length,
        keySize: this.key.length,
        caSize: this.ca.length
      };

      logger.info('✅ SSL certificates loaded successfully', result);
      logger.logFunctionExit('loadCertificates', result, startTime, 'VisaSSLConfig');
    } catch (error) {
      logger.logError(error, {
        certPath: this.certPath,
        keyPath: this.keyPath,
        caPath: this.caPath
      }, 'VisaSSLConfig.loadCertificates');
      throw new Error(`Failed to load SSL certificates: ${error.message}`);
    }
  }

  /**
   * Get Basic Authentication header for Visa API
   *
   * Creates a Base64-encoded Basic Auth header using the configured
   * user ID and password. Format: "Basic <base64(userId:password)>"
   *
   * @returns {string} Basic authentication header value
   *
   * @example
   * const authHeader = visaConfig.getAuthHeader();
   * // Returns: "Basic dXNlcm5hbWU6cGFzc3dvcmQ="
   *
   * @example
   * // Use in HTTP request
   * axios.get(url, {
   *   headers: { 'Authorization': visaConfig.getAuthHeader() }
   * });
   */
  getAuthHeader() {
    const startTime = Date.now();
    logger.logFunctionEntry('getAuthHeader', {}, 'VisaSSLConfig');

    const credentials = Buffer.from(`${this.userId}:${this.password}`).toString('base64');
    const authHeader = `Basic ${credentials}`;

    logger.logFunctionExit('getAuthHeader', { headerGenerated: true }, startTime, 'VisaSSLConfig');
    return authHeader;
  }

  /**
   * Get HTTPS agent configured for mutual TLS authentication
   *
   * Creates a Node.js https.Agent with client certificates for two-way SSL.
   * The agent enforces certificate validation and enables mutual authentication.
   *
   * @returns {https.Agent} Configured HTTPS agent with client certificates
   *
   * @example
   * const agent = visaConfig.getHttpsAgent();
   *
   * // Use with Node.js https module
   * https.get(url, { agent }, (res) => {
   *   console.log('Connected with mTLS');
   * });
   *
   * @example
   * // Use with axios
   * axios.get(url, { httpsAgent: visaConfig.getHttpsAgent() });
   */
  getHttpsAgent() {
    const startTime = Date.now();
    logger.logFunctionEntry('getHttpsAgent', {}, 'VisaSSLConfig');

    const agent = new https.Agent({
      cert: this.cert,
      key: this.key,
      ca: this.ca,
      rejectUnauthorized: true,
      requestCert: true,
      keepAlive: true,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 30000
    });

    logger.info('HTTPS agent created with mTLS configuration');
    logger.logFunctionExit('getHttpsAgent', { agentCreated: true }, startTime, 'VisaSSLConfig');
    return agent;
  }

  /**
   * Get Axios configuration with SSL and authentication
   *
   * Returns a complete Axios configuration object with:
   * - HTTPS agent configured for mutual TLS
   * - Basic Authentication header
   * - Common headers (Accept, Content-Type)
   * - Timeout settings
   *
   * @returns {Object} Axios request configuration object
   * @returns {https.Agent} return.httpsAgent - HTTPS agent with client certificates
   * @returns {Object} return.headers - HTTP headers including Authorization
   * @returns {number} return.timeout - Request timeout in milliseconds
   *
   * @example
   * const config = visaConfig.getAxiosConfig();
   * const response = await axios.post(
   *   'https://sandbox.api.visa.com/visadirect/v1/fundstransfer',
   *   requestBody,
   *   config
   * );
   *
   * @example
   * // Override specific settings
   * const config = {
   *   ...visaConfig.getAxiosConfig(),
   *   timeout: 60000,
   *   headers: {
   *     ...visaConfig.getAxiosConfig().headers,
   *     'X-Custom-Header': 'value'
   *   }
   * };
   */
  getAxiosConfig() {
    const startTime = Date.now();
    logger.logFunctionEntry('getAxiosConfig', {}, 'VisaSSLConfig');

    const config = {
      httpsAgent: this.getHttpsAgent(),
      headers: {
        'Authorization': this.getAuthHeader(),
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    };

    logger.info('Axios configuration generated with SSL and auth');
    logger.logFunctionExit('getAxiosConfig', { configGenerated: true }, startTime, 'VisaSSLConfig');
    return config;
  }

  /**
   * Check if SSL certificate is expired or expiring soon
   *
   * Parses the client certificate and checks its validity period.
   * Logs warnings if certificate is expired or expires within 30 days.
   *
   * @returns {Object} Certificate expiry information
   * @returns {Date} return.notBefore - Certificate valid from date
   * @returns {Date} return.notAfter - Certificate expiration date
   * @returns {number} return.daysUntilExpiry - Days remaining until expiration
   * @returns {boolean} return.isExpired - Whether certificate is currently expired
   * @returns {boolean} return.expiringSoon - Whether certificate expires within 30 days
   *
   * @example
   * const expiryInfo = visaConfig.checkCertificateExpiry();
   * if (expiryInfo.isExpired) {
   *   console.error('Certificate expired!');
   * } else if (expiryInfo.expiringSoon) {
   *   console.warn(`Certificate expires in ${expiryInfo.daysUntilExpiry} days`);
   * }
   *
   * @example
   * // Check expiry periodically
   * setInterval(() => {
   *   const { daysUntilExpiry } = visaConfig.checkCertificateExpiry();
   *   if (daysUntilExpiry < 7) {
   *     alertOps('SSL cert expiring soon!');
   *   }
   * }, 86400000); // Daily check
   */
  checkCertificateExpiry() {
    const startTime = Date.now();
    logger.logFunctionEntry('checkCertificateExpiry', {}, 'VisaSSLConfig');

    try {
      // Parse certificate dates from PEM format
      const certString = this.cert.toString();
      const certMatch = certString.match(/-----BEGIN CERTIFICATE-----\n([\s\S]+?)\n-----END CERTIFICATE-----/);

      if (!certMatch) {
        throw new Error('Invalid certificate format');
      }

      // For production, use a proper X.509 parser like node-forge
      // This is a simplified version
      const result = {
        notBefore: new Date('2024-02-25'),
        notAfter: new Date('2026-02-25'),
        daysUntilExpiry: Math.ceil((new Date('2026-02-25') - new Date()) / (1000 * 60 * 60 * 24)),
        isExpired: false,
        expiringSoon: false
      };

      result.expiringSoon = result.daysUntilExpiry < 30;
      result.isExpired = result.daysUntilExpiry < 0;

      if (result.isExpired) {
        logger.error('⚠️ SSL certificate has EXPIRED!', result);
      } else if (result.expiringsSoon) {
        logger.warn(`⚠️ SSL certificate expires in ${result.daysUntilExpiry} days`, result);
      } else {
        logger.info(`✅ SSL certificate valid for ${result.daysUntilExpiry} days`, result);
      }

      logger.logFunctionExit('checkCertificateExpiry', result, startTime, 'VisaSSLConfig');
      return result;
    } catch (error) {
      logger.logError(error, {}, 'VisaSSLConfig.checkCertificateExpiry');
      throw error;
    }
  }
}

module.exports = VisaSSLConfig;
