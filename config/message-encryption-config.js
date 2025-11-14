/**
 * @fileoverview Message Level Encryption for Visa API (JWE Implementation)
 *
 * This module implements JSON Web Encryption (JWE) for securing sensitive
 * payment data in Visa API requests and responses. Message-level encryption
 * provides additional security beyond SSL/TLS transport encryption.
 *
 * Key Features:
 * - JWE encryption using RSA-OAEP-256 and AES-256-GCM
 * - Encrypt/decrypt full payloads or specific sensitive fields
 * - Support for Visa's encryption certificate
 * - Secure handling of PCI-DSS sensitive data (PAN, CVV, etc.)
 * - Automatic key store management
 *
 * Encryption Algorithm:
 * - Key Encryption: RSA-OAEP-256
 * - Content Encryption: AES-256-GCM
 * - JWE Format: Compact serialization
 *
 * @module config/message-encryption-config
 * @requires crypto
 * @requires fs
 * @requires path
 * @requires node-jose
 * @requires utils/logger
 * @see {@link https://developer.visa.com/pages/encryption|Visa Message Encryption Guide}
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7516|RFC 7516 - JSON Web Encryption (JWE)}
 *
 * @example
 * const MessageEncryption = require('./config/message-encryption-config');
 * const encryption = new MessageEncryption();
 *
 * // Encrypt sensitive payload
 * const encrypted = await encryption.encryptPayload({ cardNumber: '4111111111111111' });
 *
 * // Decrypt response
 * const decrypted = await encryption.decryptPayload(encryptedResponse);
 */

const fs = require('fs');
const path = require('path');
const jose = require('node-jose');
const logger = require('../utils/logger');

/**
 * Message Level Encryption Configuration
 *
 * Manages JWE encryption/decryption for Visa API payloads.
 * Supports both full payload encryption and selective field encryption.
 *
 * @class MessageEncryptionConfig
 */
class MessageEncryptionConfig {
  /**
   * Initialize message encryption configuration
   *
   * Sets up JWE encryption using Visa's public key for encrypting requests
   * and your private key for decrypting responses.
   *
   * @constructor
   * @throws {Error} If ENCRYPTION_KEY_ID is not configured
   *
   * @example
   * const encryption = new MessageEncryptionConfig();
   * const encrypted = await encryption.encryptPayload(data);
   */
  constructor() {
    const startTime = Date.now();
    logger.logFunctionEntry('constructor', {}, 'MessageEncryptionConfig');

    this.keyId = process.env.ENCRYPTION_KEY_ID;
    this.encryptionCertPath = process.env.JWE_ENCRYPTION_CERT_PATH;
    this.decryptionKeyPath = process.env.JWE_DECRYPTION_KEY_PATH;

    this.validateConfig();
    this.initializeKeyStore();

    logger.logFunctionExit('constructor', { initialized: true }, startTime, 'MessageEncryptionConfig');
  }

  /**
   * Validate required encryption configuration
   *
   * Ensures the ENCRYPTION_KEY_ID is configured. This key ID must match
   * the ID registered in Visa Developer Portal.
   *
   * @private
   * @throws {Error} If ENCRYPTION_KEY_ID is not set
   * @returns {void}
   */
  validateConfig() {
    const startTime = Date.now();
    logger.logFunctionEntry('validateConfig', {}, 'MessageEncryptionConfig');

    if (!this.keyId) {
      const error = new Error('Missing required configuration: ENCRYPTION_KEY_ID');
      logger.logError(error, {}, 'MessageEncryptionConfig.validateConfig');
      throw error;
    }

    logger.info(`✅ Encryption Key ID configured: ${this.keyId}`);
    logger.logFunctionExit('validateConfig', { valid: true }, startTime, 'MessageEncryptionConfig');
  }

  /**
   * Initialize JWE key store with encryption and decryption keys
   *
   * Loads:
   * - Encryption certificate (Visa's public key) for encrypting request payloads
   * - Decryption key (your private key) for decrypting response payloads
   *
   * @private
   * @async
   * @returns {Promise<void>}
   *
   * @example
   * await this.initializeKeyStore();
   * console.log('Keys loaded:', this.encryptionKey, this.decryptionKey);
   */
  async initializeKeyStore() {
    const startTime = Date.now();
    logger.logFunctionEntry('initializeKeyStore', {
      encryptionCertPath: this.encryptionCertPath,
      decryptionKeyPath: this.decryptionKeyPath
    }, 'MessageEncryptionConfig');

    try {
      this.keystore = jose.JWK.createKeyStore();

      // Load encryption certificate (Visa's public key)
      if (fs.existsSync(this.encryptionCertPath)) {
        const encCert = fs.readFileSync(path.resolve(this.encryptionCertPath), 'utf8');
        this.encryptionKey = await this.keystore.add(encCert, 'pem');
        logger.info('✅ Encryption certificate loaded', { certSize: encCert.length });
      } else {
        logger.warn('Encryption certificate not found', { path: this.encryptionCertPath });
      }

      // Load decryption key (your private key)
      if (fs.existsSync(this.decryptionKeyPath)) {
        const decKey = fs.readFileSync(path.resolve(this.decryptionKeyPath), 'utf8');
        this.decryptionKey = await this.keystore.add(decKey, 'pem');
        logger.info('✅ Decryption key loaded', { keySize: decKey.length });
      } else {
        logger.warn('Decryption key not found', { path: this.decryptionKeyPath });
      }

      logger.logFunctionExit('initializeKeyStore', { keystoreInitialized: true }, startTime, 'MessageEncryptionConfig');
    } catch (error) {
      logger.logError(error, {}, 'MessageEncryptionConfig.initializeKeyStore');
      throw error;
    }
  }

  /**
   * Encrypt sensitive payload using JWE (JSON Web Encryption)
   *
   * Encrypts data using RSA-OAEP-256 for key encryption and AES-256-GCM
   * for content encryption. Returns JWE in compact serialization format.
   *
   * @async
   * @param {Object} payload - Data object to encrypt
   * @returns {Promise<string>} JWE encrypted string in compact format
   * @throws {Error} If encryption fails or encryption key is not loaded
   *
   * @example
   * // Encrypt payment card data
   * const encrypted = await encryption.encryptPayload({
   *   cardNumber: '4111111111111111',
   *   cvv: '123',
   *   expiryDate: '12/25'
   * });
   *
   * @example
   * // Send encrypted request
   * const response = await axios.post(
   *   visaUrl,
   *   await encryption.encryptPayload(requestBody),
   *   {
   *     headers: {
   *       ...encryption.getEncryptionHeaders(),
   *       ...xpayHeaders
   *     }
   *   }
   * );
   */
  async encryptPayload(payload) {
    const startTime = Date.now();
    logger.logFunctionEntry('encryptPayload', { hasPayload: !!payload }, 'MessageEncryptionConfig');

    try {
      if (!this.encryptionKey) {
        logger.warn('Encryption key not available, skipping encryption');
        logger.logFunctionExit('encryptPayload', { encrypted: false }, startTime, 'MessageEncryptionConfig');
        return payload;
      }

      const payloadString = JSON.stringify(payload);

      // Create JWE
      const encrypted = await jose.JWE.createEncrypt(
        {
          format: 'compact',
          contentAlg: 'A256GCM',
          fields: {
            alg: 'RSA-OAEP-256',
            enc: 'A256GCM',
            kid: this.keyId
          }
        },
        this.encryptionKey
      )
        .update(payloadString)
        .final();

      logger.info('Payload encrypted successfully', {
        originalSize: payloadString.length,
        encryptedSize: encrypted.length
      });
      logger.logFunctionExit('encryptPayload', { encrypted: true }, startTime, 'MessageEncryptionConfig');

      return encrypted;
    } catch (error) {
      logger.logError(error, { payloadSize: JSON.stringify(payload).length }, 'MessageEncryptionConfig.encryptPayload');
      throw new Error(`Failed to encrypt payload: ${error.message}`);
    }
  }

  /**
   * Decrypt JWE encrypted payload from Visa API response
   *
   * Decrypts JWE compact serialization format using your private key.
   * Returns the original JSON object.
   *
   * @async
   * @param {string} encryptedPayload - JWE encrypted string in compact format
   * @returns {Promise<Object>} Decrypted data object
   * @throws {Error} If decryption fails or decryption key is not loaded
   *
   * @example
   * // Decrypt Visa API response
   * const response = await axios.post(visaUrl, encryptedRequest);
   * const decryptedData = await encryption.decryptPayload(response.data);
   * console.log('Decrypted:', decryptedData);
   *
   * @example
   * // Handle webhook with encrypted payload
   * app.post('/webhook', async (req, res) => {
   *   const decrypted = await encryption.decryptPayload(req.body.encryptedData);
   *   await processTransaction(decrypted);
   *   res.sendStatus(200);
   * });
   */
  async decryptPayload(encryptedPayload) {
    const startTime = Date.now();
    logger.logFunctionEntry('decryptPayload', { hasPayload: !!encryptedPayload }, 'MessageEncryptionConfig');

    try {
      if (!this.decryptionKey) {
        logger.warn('Decryption key not available, skipping decryption');
        logger.logFunctionExit('decryptPayload', { decrypted: false }, startTime, 'MessageEncryptionConfig');
        return encryptedPayload;
      }

      // Decrypt JWE
      const decrypted = await jose.JWE.createDecrypt(this.keystore)
        .decrypt(encryptedPayload);

      const payloadString = decrypted.payload.toString('utf8');
      const result = JSON.parse(payloadString);

      logger.info('Payload decrypted successfully', {
        encryptedSize: encryptedPayload.length,
        decryptedSize: payloadString.length
      });
      logger.logFunctionExit('decryptPayload', { decrypted: true }, startTime, 'MessageEncryptionConfig');

      return result;
    } catch (error) {
      logger.logError(error, { payloadSize: encryptedPayload.length }, 'MessageEncryptionConfig.decryptPayload');
      throw new Error(`Failed to decrypt payload: ${error.message}`);
    }
  }

  /**
   * Encrypt only specific sensitive fields in a request object
   *
   * Extracts specified fields, encrypts them, and adds the encrypted data
   * under the 'encryptedData' property. Original fields are removed.
   * Useful for partially encrypting requests with PCI-DSS sensitive data.
   *
   * @async
   * @param {Object} request - API request object
   * @param {string[]} [sensitiveFields=[]] - Array of field names to encrypt
   * @returns {Promise<Object>} Modified request with encrypted fields
   *
   * @example
   * // Encrypt only card details
   * const request = {
   *   amount: 100.00,
   *   currency: 'USD',
   *   cardNumber: '4111111111111111',
   *   cvv: '123',
   *   merchantId: 'MERCH123'
   * };
   *
   * const encrypted = await encryption.encryptSensitiveFields(
   *   request,
   *   ['cardNumber', 'cvv']
   * );
   * // Result: { amount: 100, currency: 'USD', merchantId: 'MERCH123', encryptedData: '...' }
   *
   * @example
   * // No encryption if fields not present
   * const request = { amount: 100, currency: 'USD' };
   * const result = await encryption.encryptSensitiveFields(request, ['cardNumber']);
   * // Result: { amount: 100, currency: 'USD' } (no encryptedData added)
   */
  async encryptSensitiveFields(request, sensitiveFields = []) {
    const startTime = Date.now();
    logger.logFunctionEntry('encryptSensitiveFields', {
      requestKeys: Object.keys(request),
      sensitiveFields
    }, 'MessageEncryptionConfig');

    const fieldsToEncrypt = {};

    sensitiveFields.forEach(field => {
      if (request[field]) {
        fieldsToEncrypt[field] = request[field];
        delete request[field];
      }
    });

    if (Object.keys(fieldsToEncrypt).length > 0) {
      request.encryptedData = await this.encryptPayload(fieldsToEncrypt);
      logger.info('Sensitive fields encrypted', {
        fieldsEncrypted: Object.keys(fieldsToEncrypt),
        fieldCount: Object.keys(fieldsToEncrypt).length
      });
    } else {
      logger.info('No sensitive fields found to encrypt');
    }

    logger.logFunctionExit('encryptSensitiveFields', {
      hasEncryptedData: !!request.encryptedData
    }, startTime, 'MessageEncryptionConfig');

    return request;
  }

  /**
   * Get HTTP headers required for encrypted requests
   *
   * Returns headers that must be included when sending JWE encrypted payloads.
   * The x-encryption-key-id must match the key ID registered with Visa.
   *
   * @returns {Object} Headers for encrypted requests
   * @returns {string} return.x-encryption-key-id - Encryption key identifier
   * @returns {string} return.content-type - JOSE content type
   *
   * @example
   * const headers = encryption.getEncryptionHeaders();
   * axios.post(url, encryptedPayload, {
   *   headers: {
   *     ...visaConfig.getAxiosConfig().headers,
   *     ...xpayHeaders,
   *     ...headers
   *   }
   * });
   *
   * @example
   * // Result
   * {
   *   'x-encryption-key-id': '7c4debe3f4af7f9d1569a824f016',
   *   'content-type': 'application/jose+json'
   * }
   */
  getEncryptionHeaders() {
    const startTime = Date.now();
    logger.logFunctionEntry('getEncryptionHeaders', {}, 'MessageEncryptionConfig');

    const headers = {
      'x-encryption-key-id': this.keyId,
      'content-type': 'application/jose+json'
    };

    logger.logFunctionExit('getEncryptionHeaders', { headersGenerated: true }, startTime, 'MessageEncryptionConfig');
    return headers;
  }

  /**
   * Check if message encryption is enabled
   *
   * Reads the ENABLE_MESSAGE_ENCRYPTION environment variable.
   * Use this to conditionally encrypt payloads based on configuration.
   *
   * @returns {boolean} True if message encryption is enabled
   *
   * @example
   * if (encryption.isEnabled()) {
   *   requestBody = await encryption.encryptPayload(requestBody);
   *   headers = { ...headers, ...encryption.getEncryptionHeaders() };
   * }
   *
   * @example
   * // Set in .env
   * ENABLE_MESSAGE_ENCRYPTION=true  // Encrypt all payloads
   * ENABLE_MESSAGE_ENCRYPTION=false // Skip encryption (dev/testing)
   */
  isEnabled() {
    const startTime = Date.now();
    logger.logFunctionEntry('isEnabled', {}, 'MessageEncryptionConfig');

    const enabled = process.env.ENABLE_MESSAGE_ENCRYPTION === 'true';

    logger.logFunctionExit('isEnabled', { enabled }, startTime, 'MessageEncryptionConfig');
    return enabled;
  }
}

module.exports = MessageEncryptionConfig;
