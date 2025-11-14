/**
 * @fileoverview X-Pay-Token Configuration for Visa API Authentication
 *
 * This module implements Visa's X-Pay-Token authentication mechanism using
 * RSA-2048 digital signatures. The X-Pay-Token is required for all Visa API
 * requests and provides an additional layer of security beyond SSL/TLS.
 *
 * Key Features:
 * - RSA-2048 key pair generation and management
 * - X-Pay-Token generation with timestamp and signature
 * - Token validation for incoming webhooks
 * - Automatic key loading or generation
 * - Timestamp-based replay attack prevention
 *
 * X-Pay-Token Format: xv2:{timestamp}:{signature}
 * - Version: xv2 (X-Pay-Token version 2)
 * - Timestamp: Unix epoch seconds
 * - Signature: RSA-SHA256 signature of hashed payload
 *
 * @module config/xpay-token-config
 * @requires crypto
 * @requires fs
 * @requires path
 * @requires utils/logger
 * @see {@link https://developer.visa.com/pages/authentication|Visa Authentication Guide}
 *
 * @example
 * const XPayTokenConfig = require('./config/xpay-token-config');
 * const xpay = new XPayTokenConfig();
 *
 * // Generate token for API request
 * const headers = xpay.getHeaders('/visadirect/v1/fundstransfer', '', JSON.stringify(body));
 *
 * // Validate incoming webhook token
 * const isValid = xpay.validateXPayToken(token, path, query, body);
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * X-Pay-Token Configuration and Management
 *
 * Manages RSA key pairs and generates/validates X-Pay-Token headers
 * for Visa API authentication. Automatically generates keys if not found.
 *
 * @class XPayTokenConfig
 */
class XPayTokenConfig {
  /**
   * Initialize X-Pay-Token configuration
   *
   * Validates environment variables and loads or generates RSA key pair.
   * Keys are automatically generated if they don't exist.
   *
   * @constructor
   * @throws {Error} If XPAY_API_KEY is not configured
   *
   * @example
   * const xpay = new XPayTokenConfig();
   * console.log('API Key:', xpay.apiKey);
   */
  constructor() {
    const startTime = Date.now();
    logger.logFunctionEntry('constructor', {}, 'XPayTokenConfig');

    this.apiKey = process.env.XPAY_API_KEY;
    this.publicKeyPath = process.env.XPAY_PUBLIC_KEY_PATH;
    this.privateKeyPath = process.env.XPAY_PRIVATE_KEY_PATH;

    this.validateConfig();
    this.loadKeys();

    logger.logFunctionExit('constructor', { initialized: true }, startTime, 'XPayTokenConfig');
  }

  /**
   * Validate required X-Pay-Token configuration
   *
   * Ensures the XPAY_API_KEY environment variable is set.
   * This API key is required for all Visa API requests.
   *
   * @private
   * @throws {Error} If XPAY_API_KEY is not configured
   * @returns {void}
   */
  validateConfig() {
    const startTime = Date.now();
    logger.logFunctionEntry('validateConfig', {}, 'XPayTokenConfig');

    if (!this.apiKey) {
      const error = new Error('Missing required configuration: XPAY_API_KEY');
      logger.logError(error, {}, 'XPayTokenConfig.validateConfig');
      throw error;
    }

    logger.info('X-Pay-Token configuration validated');
    logger.logFunctionExit('validateConfig', { valid: true }, startTime, 'XPayTokenConfig');
  }

  /**
   * Load RSA keys for X-Pay-Token authentication
   *
   * Attempts to load existing RSA key pair from file system.
   * If keys don't exist, automatically generates new ones.
   *
   * @private
   * @throws {Error} If keys cannot be loaded or generated
   * @returns {void}
   *
   * @example
   * this.loadKeys();
   * console.log('Public key loaded:', this.publicKey.substring(0, 50));
   */
  loadKeys() {
    const startTime = Date.now();
    logger.logFunctionEntry('loadKeys', {
      publicKeyPath: this.publicKeyPath,
      privateKeyPath: this.privateKeyPath
    }, 'XPayTokenConfig');

    try {
      // Check if keys exist, generate if not
      if (!fs.existsSync(this.privateKeyPath)) {
        logger.info('🔑 Private key not found, generating new RSA key pair...');
        this.generateKeyPair();
      } else {
        this.publicKey = fs.readFileSync(path.resolve(this.publicKeyPath), 'utf8');
        this.privateKey = fs.readFileSync(path.resolve(this.privateKeyPath), 'utf8');
        logger.info('✅ X-Pay-Token keys loaded successfully', {
          publicKeySize: this.publicKey.length,
          privateKeySize: this.privateKey.length
        });
      }

      logger.logFunctionExit('loadKeys', { keysLoaded: true }, startTime, 'XPayTokenConfig');
    } catch (error) {
      logger.logError(error, {
        publicKeyPath: this.publicKeyPath,
        privateKeyPath: this.privateKeyPath
      }, 'XPayTokenConfig.loadKeys');
      throw error;
    }
  }

  /**
   * Generate new RSA-2048 key pair for X-Pay-Token
   *
   * Creates a new RSA key pair with 2048-bit modulus length.
   * Keys are saved to configured file paths and must be registered
   * with Visa Developer Portal.
   *
   * @private
   * @throws {Error} If key generation or file writing fails
   * @returns {void}
   *
   * @example
   * this.generateKeyPair();
   * // Keys saved to keys/xpay-public.pem and keys/xpay-private.pem
   *
   * @see {@link https://developer.visa.com/pages/authentication#register-public-key|Register Public Key}
   */
  generateKeyPair() {
    const startTime = Date.now();
    logger.logFunctionEntry('generateKeyPair', {}, 'XPayTokenConfig');

    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // Create keys directory if it doesn't exist
      const keysDir = path.dirname(this.publicKeyPath);
      if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
        logger.info('Created keys directory', { path: keysDir });
      }

      // Save keys to files
      fs.writeFileSync(this.publicKeyPath, publicKey);
      fs.writeFileSync(this.privateKeyPath, privateKey);

      this.publicKey = publicKey;
      this.privateKey = privateKey;

      logger.info('✅ X-Pay-Token RSA key pair generated successfully', {
        publicKeyPath: this.publicKeyPath,
        privateKeyPath: this.privateKeyPath,
        modulusLength: 2048
      });

      // Display public key for registration with Visa
      console.log('\n📋 Copy this public key to Visa Developer Portal:');
      console.log('─'.repeat(80));
      console.log(publicKey);
      console.log('─'.repeat(80));

      logger.logFunctionExit('generateKeyPair', { generated: true }, startTime, 'XPayTokenConfig');
    } catch (error) {
      logger.logError(error, {}, 'XPayTokenConfig.generateKeyPair');
      throw error;
    }
  }

  /**
   * Generate X-Pay-Token header for API request
   *
   * Creates a timestamped digital signature of the request payload.
   * The token format is: xv2:{timestamp}:{signature}
   *
   * Algorithm:
   * 1. Create pre-hash string: timestamp + resourcePath + queryString + requestBody
   * 2. Generate SHA-256 hash of pre-hash string
   * 3. Sign hash with RSA private key
   * 4. Return formatted token: xv2:{timestamp}:{signature}
   *
   * @param {string} resourcePath - API endpoint path (e.g., "/visadirect/v1/fundstransfer")
   * @param {string} [queryString=''] - URL query parameters (e.g., "?page=1&limit=10")
   * @param {string} [requestBody=''] - JSON request body as string
   * @returns {string} X-Pay-Token in format: xv2:{timestamp}:{signature}
   *
   * @example
   * const token = xpay.generateXPayToken(
   *   '/visadirect/v1/fundstransfer',
   *   '',
   *   JSON.stringify({ amount: 100 })
   * );
   * // Returns: "xv2:1703001234:a1b2c3d4..."
   *
   * @example
   * // With query string
   * const token = xpay.generateXPayToken(
   *   '/visa/transactions',
   *   '?status=completed',
   *   ''
   * );
   */
  generateXPayToken(resourcePath, queryString = '', requestBody = '') {
    const startTime = Date.now();
    logger.logFunctionEntry('generateXPayToken', { resourcePath, hasQueryString: !!queryString, hasBody: !!requestBody }, 'XPayTokenConfig');

    const timestamp = Math.floor(Date.now() / 1000);

    // Pre-hash string: timestamp + resourcePath + queryString + requestBody
    const preHashString = `${timestamp}${resourcePath}${queryString}${requestBody}`;

    // Create SHA-256 hash
    const hash = crypto.createHash('sha256').update(preHashString).digest('hex');

    // Sign with private key
    const sign = crypto.createSign('SHA256');
    sign.update(hash);
    sign.end();

    const signature = sign.sign(this.privateKey, 'hex');

    // X-Pay-Token format: xv2:timestamp:signature
    const token = `xv2:${timestamp}:${signature}`;

    logger.info('X-Pay-Token generated', { timestamp, signatureLength: signature.length });
    logger.logFunctionExit('generateXPayToken', { tokenGenerated: true }, startTime, 'XPayTokenConfig');

    return token;
  }

  /**
   * Validate X-Pay-Token from incoming webhook or response
   *
   * Verifies the authenticity and freshness of an X-Pay-Token.
   * Rejects tokens older than 5 minutes to prevent replay attacks.
   *
   * Validation Steps:
   * 1. Parse token format (xv2:timestamp:signature)
   * 2. Check timestamp is within 5 minutes
   * 3. Recreate hash from payload
   * 4. Verify signature using public key
   *
   * @param {string} xPayToken - Token to validate (format: xv2:timestamp:signature)
   * @param {string} resourcePath - API endpoint path
   * @param {string} [queryString=''] - URL query parameters
   * @param {string} [requestBody=''] - Request/response body as string
   * @returns {boolean} True if token is valid and not expired
   *
   * @example
   * const isValid = xpay.validateXPayToken(
   *   req.headers['x-pay-token'],
   *   req.path,
   *   req.query,
   *   JSON.stringify(req.body)
   * );
   * if (!isValid) {
   *   return res.status(401).json({ error: 'Invalid X-Pay-Token' });
   * }
   *
   * @example
   * // Webhook validation
   * app.post('/webhook', (req, res) => {
   *   const token = req.headers['x-pay-token'];
   *   if (!xpay.validateXPayToken(token, req.path, '', JSON.stringify(req.body))) {
   *     return res.status(401).send('Unauthorized');
   *   }
   *   // Process webhook...
   * });
   */
  validateXPayToken(xPayToken, resourcePath, queryString = '', requestBody = '') {
    const startTime = Date.now();
    logger.logFunctionEntry('validateXPayToken', { resourcePath, hasQueryString: !!queryString, hasBody: !!requestBody }, 'XPayTokenConfig');

    try {
      const [version, timestamp, signature] = xPayToken.split(':');

      if (version !== 'xv2') {
        logger.warn('X-Pay-Token rejected: invalid version', { version });
        logger.logFunctionExit('validateXPayToken', { valid: false, reason: 'invalid_version' }, startTime, 'XPayTokenConfig');
        return false;
      }

      // Check timestamp (reject if older than 5 minutes)
      const now = Math.floor(Date.now() / 1000);
      const age = now - parseInt(timestamp);
      if (age > 300) {
        logger.warn('X-Pay-Token rejected: timestamp too old', { age, maxAge: 300 });
        logger.logFunctionExit('validateXPayToken', { valid: false, reason: 'expired' }, startTime, 'XPayTokenConfig');
        return false;
      }

      // Recreate hash
      const preHashString = `${timestamp}${resourcePath}${queryString}${requestBody}`;
      const hash = crypto.createHash('sha256').update(preHashString).digest('hex');

      // Verify signature
      const verify = crypto.createVerify('SHA256');
      verify.update(hash);
      verify.end();

      const isValid = verify.verify(this.publicKey, signature, 'hex');

      logger.info('X-Pay-Token validation result', { valid: isValid, tokenAge: age });
      logger.logFunctionExit('validateXPayToken', { valid: isValid }, startTime, 'XPayTokenConfig');

      return isValid;
    } catch (error) {
      logger.logError(error, { xPayToken }, 'XPayTokenConfig.validateXPayToken');
      logger.logFunctionExit('validateXPayToken', { valid: false, reason: 'error' }, startTime, 'XPayTokenConfig');
      return false;
    }
  }

  /**
   * Get complete headers for Visa API request
   *
   * Generates X-Pay-Token and includes client transaction ID.
   * These headers must be included in all Visa API requests.
   *
   * @param {string} resourcePath - API endpoint path
   * @param {string} [queryString=''] - URL query parameters
   * @param {string} [requestBody=''] - JSON request body as string
   * @returns {Object} Headers object with x-pay-token and x-client-transaction-id
   * @returns {string} return.x-pay-token - Generated X-Pay-Token
   * @returns {string} return.x-client-transaction-id - Unique transaction UUID
   *
   * @example
   * const headers = xpay.getHeaders(
   *   '/visadirect/v1/fundstransfer',
   *   '',
   *   JSON.stringify(requestBody)
   * );
   *
   * axios.post(url, requestBody, {
   *   headers: {
   *     ...visaConfig.getAxiosConfig().headers,
   *     ...headers
   *   }
   * });
   *
   * @example
   * // With query string
   * const headers = xpay.getHeaders(
   *   '/visa/accounts',
   *   '?status=active&limit=100',
   *   ''
   * );
   */
  getHeaders(resourcePath, queryString = '', requestBody = '') {
    const startTime = Date.now();
    logger.logFunctionEntry('getHeaders', { resourcePath }, 'XPayTokenConfig');

    const xPayToken = this.generateXPayToken(resourcePath, queryString, requestBody);
    const clientTxId = crypto.randomUUID();

    const headers = {
      'x-pay-token': xPayToken,
      'x-client-transaction-id': clientTxId
    };

    logger.info('X-Pay headers generated', { clientTxId });
    logger.logFunctionExit('getHeaders', { headersGenerated: true }, startTime, 'XPayTokenConfig');

    return headers;
  }

  /**
   * Get public key in PEM format for Visa registration
   *
   * Returns the RSA public key that must be registered in the
   * Visa Developer Portal before making API requests.
   *
   * @returns {string} Public key in PEM format
   *
   * @example
   * const publicKey = xpay.getPublicKeyPEM();
   * console.log('Register this key with Visa:');
   * console.log(publicKey);
   *
   * @example
   * // Save to file for registration
   * const fs = require('fs');
   * fs.writeFileSync('visa-public-key.pem', xpay.getPublicKeyPEM());
   *
   * @see {@link https://developer.visa.com/pages/authentication#register-public-key|Register Public Key}
   */
  getPublicKeyPEM() {
    const startTime = Date.now();
    logger.logFunctionEntry('getPublicKeyPEM', {}, 'XPayTokenConfig');

    logger.logFunctionExit('getPublicKeyPEM', { keyLength: this.publicKey.length }, startTime, 'XPayTokenConfig');
    return this.publicKey;
  }
}

module.exports = XPayTokenConfig;
