/**
 * @fileoverview Webhook Handler for Visa API Event Notifications
 *
 * This module provides secure webhook handling for Visa API event notifications
 * including transaction updates, authorization events, and payment status changes.
 * All webhooks are validated using HMAC-SHA256 signatures with a shared secret.
 *
 * Key Features:
 * - HMAC-SHA256 signature validation with shared secret
 * - Replay attack prevention using timestamp validation (5-minute window)
 * - Event routing and processing for 6 event types
 * - Express middleware for easy integration
 * - Timing-safe signature comparison
 * - Comprehensive error handling and logging
 *
 * Supported Event Types:
 * - TRANSACTION_COMPLETED: Payment successfully processed
 * - TRANSACTION_FAILED: Payment processing failed
 * - TRANSACTION_REVERSED: Payment refunded or reversed
 * - TRANSACTION_PENDING: Payment awaiting final status
 * - AUTHORIZATION_APPROVED: Card authorization approved
 * - AUTHORIZATION_DECLINED: Card authorization declined
 *
 * Security:
 * - Signature validation prevents unauthorized webhooks
 * - Timestamp validation prevents replay attacks
 * - Timing-safe comparison prevents timing attacks
 * - Shared secret stored securely in environment variables
 *
 * @module config/webhook-handler
 * @requires crypto
 * @requires utils/logger
 * @see {@link https://developer.visa.com/pages/webhooks|Visa Webhooks Guide}
 *
 * @example
 * const WebhookHandler = require('./config/webhook-handler');
 * const webhookHandler = new WebhookHandler();
 *
 * // Use as Express middleware
 * app.post('/webhooks/visa', webhookHandler.middleware());
 *
 * // Manual validation
 * const isValid = webhookHandler.validateSignature(
 *   req.body,
 *   req.headers['x-visa-signature'],
 *   req.headers['x-visa-timestamp']
 * );
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Webhook Handler for Visa API Events
 *
 * Validates and processes incoming webhook notifications from Visa.
 * Ensures security through HMAC signature validation and timestamp checking.
 *
 * @class WebhookHandler
 */
class WebhookHandler {
  /**
   * Initialize Webhook Handler with shared secret
   *
   * Loads the webhook shared secret from environment variables.
   * This secret is used for HMAC-SHA256 signature validation.
   *
   * @constructor
   * @throws {Error} If WEBHOOK_SECRET is not configured
   *
   * @example
   * const webhookHandler = new WebhookHandler();
   * app.post('/webhooks/visa', webhookHandler.middleware());
   */
  constructor() {
    const startTime = Date.now();
    logger.logFunctionEntry('constructor', {}, 'WebhookHandler');

    this.sharedSecret = process.env.WEBHOOK_SECRET;

    if (!this.sharedSecret) {
      const error = new Error('WEBHOOK_SECRET is not configured in environment variables');
      logger.logError(error, {}, 'WebhookHandler.constructor');
      throw error;
    }

    logger.info('Webhook handler initialized with shared secret');
    logger.logFunctionExit('constructor', { initialized: true }, startTime, 'WebhookHandler');
  }

  /**
   * Validate webhook signature using HMAC-SHA256
   *
   * Validates that the webhook came from Visa by verifying the HMAC signature.
   * Also checks timestamp to prevent replay attacks (5-minute window).
   *
   * Validation Steps:
   * 1. Check timestamp is within 5 minutes (prevents replay attacks)
   * 2. Recreate signature payload: timestamp + "." + body
   * 3. Generate expected HMAC-SHA256 signature
   * 4. Compare using timing-safe comparison
   *
   * @param {Object|string} payload - Webhook request body (JSON object or string)
   * @param {string} signature - Signature from x-visa-signature header (base64)
   * @param {string} timestamp - Unix timestamp from x-visa-timestamp header
   * @returns {boolean} True if signature is valid and timestamp is fresh
   *
   * @example
   * app.post('/webhooks/visa', (req, res) => {
   *   const isValid = webhookHandler.validateSignature(
   *     req.body,
   *     req.headers['x-visa-signature'],
   *     req.headers['x-visa-timestamp']
   *   );
   *
   *   if (!isValid) {
   *     return res.status(401).json({ error: 'Invalid signature' });
   *   }
   *
   *   // Process webhook...
   *   res.sendStatus(200);
   * });
   *
   * @example
   * // Webhook headers
   * {
   *   'x-visa-signature': 'a1b2c3d4...', // Base64 HMAC-SHA256
   *   'x-visa-timestamp': '1703001234',  // Unix seconds
   *   'content-type': 'application/json'
   * }
   */
  validateSignature(payload, signature, timestamp) {
    const startTime = Date.now();
    logger.logFunctionEntry('validateSignature', {
      hasPayload: !!payload,
      hasSignature: !!signature,
      timestamp
    }, 'WebhookHandler');

    try {
      // Check timestamp to prevent replay attacks (within 5 minutes)
      const now = Math.floor(Date.now() / 1000);
      const webhookTime = parseInt(timestamp);
      const timeDiff = Math.abs(now - webhookTime);

      if (timeDiff > 300) { // 5 minutes
        logger.warn('Webhook rejected: timestamp too old or in future', {
          timeDiff,
          maxAge: 300,
          webhookTime,
          currentTime: now
        });
        logger.logFunctionExit('validateSignature', { valid: false, reason: 'timestamp_expired' }, startTime, 'WebhookHandler');
        return false;
      }

      // Create signature payload: timestamp + payload
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const signaturePayload = `${timestamp}.${payloadString}`;

      // Generate expected signature using HMAC-SHA256
      const expectedSignature = crypto
        .createHmac('sha256', this.sharedSecret)
        .update(signaturePayload)
        .digest('base64');

      // Compare signatures (timing-safe comparison)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (isValid) {
        logger.info('✅ Webhook signature validated successfully', { timeDiff });
      } else {
        logger.warn('⚠️ Webhook signature validation failed');
      }

      logger.logFunctionExit('validateSignature', { valid: isValid }, startTime, 'WebhookHandler');
      return isValid;
    } catch (error) {
      logger.logError(error, { timestamp }, 'WebhookHandler.validateSignature');
      logger.logFunctionExit('validateSignature', { valid: false, reason: 'error' }, startTime, 'WebhookHandler');
      return false;
    }
  }

  /**
   * Generate webhook signature for testing purposes
   *
   * Creates a valid HMAC-SHA256 signature for testing webhook handlers.
   * Useful for integration tests and development.
   *
   * @param {Object|string} payload - Webhook payload to sign
   * @param {string|null} [timestamp=null] - Optional timestamp (defaults to current time)
   * @returns {Object} Signature and timestamp
   * @returns {string} return.signature - Base64-encoded HMAC-SHA256 signature
   * @returns {string} return.timestamp - Unix timestamp used in signature
   *
   * @example
   * // Generate signature for testing
   * const payload = { eventType: 'TRANSACTION_COMPLETED', data: {...} };
   * const { signature, timestamp } = webhookHandler.generateSignature(payload);
   *
   * // Use in test request
   * const response = await axios.post('/webhooks/visa', payload, {
   *   headers: {
   *     'x-visa-signature': signature,
   *     'x-visa-timestamp': timestamp
   *   }
   * });
   *
   * @example
   * // With custom timestamp
   * const { signature, timestamp } = webhookHandler.generateSignature(
   *   payload,
   *   '1703001234'
   * );
   */
  generateSignature(payload, timestamp = null) {
    const startTime = Date.now();
    logger.logFunctionEntry('generateSignature', { hasPayload: !!payload, customTimestamp: !!timestamp }, 'WebhookHandler');

    const ts = timestamp || Math.floor(Date.now() / 1000).toString();
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const signaturePayload = `${ts}.${payloadString}`;

    const signature = crypto
      .createHmac('sha256', this.sharedSecret)
      .update(signaturePayload)
      .digest('base64');

    logger.info('Webhook signature generated for testing', { timestamp: ts });
    logger.logFunctionExit('generateSignature', { signatureGenerated: true }, startTime, 'WebhookHandler');

    return {
      signature,
      timestamp: ts
    };
  }

  /**
   * Process webhook event and route to appropriate handler
   *
   * Routes validated webhook events to specific event handlers based on event type.
   * Each handler processes the event data and returns a result.
   *
   * @async
   * @param {Object} event - Webhook event data
   * @param {string} event.eventType - Type of event (TRANSACTION_COMPLETED, etc.)
   * @param {Object} event.data - Event payload data
   * @returns {Promise<Object>} Processing result from event handler
   * @returns {string} return.status - Processing status ('processed' or 'ignored')
   * @returns {string} return.message - Human-readable message
   * @returns {string} [return.transactionId] - Transaction ID if applicable
   *
   * @example
   * const event = {
   *   eventType: 'TRANSACTION_COMPLETED',
   *   data: {
   *     transactionId: 'TXN123456',
   *     amount: 100.00,
   *     currency: 'USD'
   *   }
   * };
   *
   * const result = await webhookHandler.processEvent(event);
   * // Returns: { status: 'processed', message: '...', transactionId: 'TXN123456' }
   *
   * @example
   * // Unknown event type
   * const event = { eventType: 'UNKNOWN_EVENT', data: {} };
   * const result = await webhookHandler.processEvent(event);
   * // Returns: { status: 'ignored', message: 'Unknown event type' }
   */
  async processEvent(event) {
    const startTime = Date.now();
    const { eventType, data } = event;

    logger.logFunctionEntry('processEvent', { eventType, hasData: !!data }, 'WebhookHandler');
    logger.logWebhook(event, 'incoming');

    let result;
    switch (eventType) {
    case 'TRANSACTION_COMPLETED':
      result = await this.handleTransactionCompleted(data);
      break;

    case 'TRANSACTION_FAILED':
      result = await this.handleTransactionFailed(data);
      break;

    case 'TRANSACTION_REVERSED':
      result = await this.handleTransactionReversed(data);
      break;

    case 'TRANSACTION_PENDING':
      result = await this.handleTransactionPending(data);
      break;

    case 'AUTHORIZATION_APPROVED':
      result = await this.handleAuthorizationApproved(data);
      break;

    case 'AUTHORIZATION_DECLINED':
      result = await this.handleAuthorizationDeclined(data);
      break;

    default:
      logger.warn(`Unknown webhook event type: ${eventType}`);
      result = { status: 'ignored', message: 'Unknown event type' };
    }

    logger.info(`Webhook event processed: ${eventType}`, { result });
    logger.logFunctionExit('processEvent', result, startTime, 'WebhookHandler');

    return result;
  }

  /**
   * Handle TRANSACTION_COMPLETED webhook event
   *
   * Processes successful transaction completion events.
   * Updates database, notifies users, and updates account balances.
   *
   * @async
   * @param {Object} data - Transaction completion data
   * @param {string} data.transactionId - Unique transaction identifier
   * @param {number} data.amount - Transaction amount
   * @param {string} data.currency - Currency code (USD, EUR, etc.)
   * @param {Object} data.metadata - Additional transaction metadata
   * @returns {Promise<Object>} Processing result
   *
   * @example
   * const data = {
   *   transactionId: 'TXN123456',
   *   amount: 100.00,
   *   currency: 'USD',
   *   metadata: { orderId: 'ORD789' }
   * };
   * const result = await handler.handleTransactionCompleted(data);
   *
   * @todo Update transaction status in database
   * @todo Notify user of successful transaction
   * @todo Update account balances
   */
  async handleTransactionCompleted(data) {
    const startTime = Date.now();
    logger.logFunctionEntry('handleTransactionCompleted', {
      transactionId: data.transactionId,
      amount: data.amount,
      currency: data.currency
    }, 'WebhookHandler');

    logger.info('Transaction completed', {
      transactionId: data.transactionId,
      amount: data.amount,
      currency: data.currency
    });

    // TODO: Update transaction status in database
    // TODO: Notify user of successful transaction
    // TODO: Update account balances

    const result = {
      status: 'processed',
      message: 'Transaction completed successfully',
      transactionId: data.transactionId
    };

    logger.logFunctionExit('handleTransactionCompleted', result, startTime, 'WebhookHandler');
    return result;
  }

  /**
   * Handle TRANSACTION_FAILED webhook event
   *
   * Processes failed transaction events and records failure reasons.
   * Updates database and notifies users of transaction failures.
   *
   * @async
   * @param {Object} data - Transaction failure data
   * @param {string} data.transactionId - Unique transaction identifier
   * @param {string} data.failureReason - Reason for transaction failure
   * @param {string} data.failureCode - Error code
   * @returns {Promise<Object>} Processing result
   *
   * @example
   * const data = {
   *   transactionId: 'TXN123456',
   *   failureReason: 'Insufficient funds',
   *   failureCode: 'INSUFFICIENT_FUNDS'
   * };
   * const result = await handler.handleTransactionFailed(data);
   *
   * @todo Update transaction status in database
   * @todo Notify user of failed transaction
   * @todo Log failure reason for analytics
   */
  async handleTransactionFailed(data) {
    const startTime = Date.now();
    logger.logFunctionEntry('handleTransactionFailed', {
      transactionId: data.transactionId,
      failureReason: data.failureReason
    }, 'WebhookHandler');

    logger.error('Transaction failed', {
      transactionId: data.transactionId,
      reason: data.failureReason,
      code: data.failureCode
    });

    // TODO: Update transaction status in database
    // TODO: Notify user of failed transaction
    // TODO: Log failure reason

    const result = {
      status: 'processed',
      message: 'Transaction failure recorded',
      transactionId: data.transactionId,
      reason: data.failureReason
    };

    logger.logFunctionExit('handleTransactionFailed', result, startTime, 'WebhookHandler');
    return result;
  }

  /**
   * Handle TRANSACTION_REVERSED webhook event
   *
   * Processes transaction reversal (refund) events.
   * Reverses account balances and notifies users.
   *
   * @async
   * @param {Object} data - Transaction reversal data
   * @param {string} data.transactionId - Original transaction identifier
   * @param {string} data.reversalReason - Reason for reversal
   * @param {number} data.amount - Reversed amount
   * @returns {Promise<Object>} Processing result
   *
   * @example
   * const data = {
   *   transactionId: 'TXN123456',
   *   reversalReason: 'Customer requested refund',
   *   amount: 100.00
   * };
   * const result = await handler.handleTransactionReversed(data);
   *
   * @todo Update transaction status in database
   * @todo Reverse account balances
   * @todo Notify user of reversal
   */
  async handleTransactionReversed(data) {
    const startTime = Date.now();
    logger.logFunctionEntry('handleTransactionReversed', {
      transactionId: data.transactionId,
      amount: data.amount,
      reason: data.reversalReason
    }, 'WebhookHandler');

    logger.warn('Transaction reversed', {
      transactionId: data.transactionId,
      reason: data.reversalReason,
      amount: data.amount
    });

    // TODO: Update transaction status in database
    // TODO: Reverse account balances
    // TODO: Notify user of reversal

    const result = {
      status: 'processed',
      message: 'Transaction reversal processed',
      transactionId: data.transactionId
    };

    logger.logFunctionExit('handleTransactionReversed', result, startTime, 'WebhookHandler');
    return result;
  }

  /**
   * Handle TRANSACTION_PENDING webhook event
   *
   * Processes transactions awaiting final status.
   * Sets up polling or monitoring for status updates.
   *
   * @async
   * @param {Object} data - Pending transaction data
   * @param {string} data.transactionId - Unique transaction identifier
   * @param {string} data.pendingReason - Reason for pending status
   * @param {number} data.estimatedCompletionTime - Estimated completion timestamp
   * @returns {Promise<Object>} Processing result
   *
   * @example
   * const data = {
   *   transactionId: 'TXN123456',
   *   pendingReason: 'Awaiting bank confirmation',
   *   estimatedCompletionTime: 1703005000
   * };
   * const result = await handler.handleTransactionPending(data);
   *
   * @todo Update transaction status to pending
   * @todo Set up polling for final status
   */
  async handleTransactionPending(data) {
    const startTime = Date.now();
    logger.logFunctionEntry('handleTransactionPending', {
      transactionId: data.transactionId,
      pendingReason: data.pendingReason
    }, 'WebhookHandler');

    logger.info('Transaction pending', {
      transactionId: data.transactionId,
      reason: data.pendingReason
    });

    // TODO: Update transaction status to pending
    // TODO: Set up polling for final status

    const result = {
      status: 'processed',
      message: 'Transaction marked as pending',
      transactionId: data.transactionId
    };

    logger.logFunctionExit('handleTransactionPending', result, startTime, 'WebhookHandler');
    return result;
  }

  /**
   * Handle AUTHORIZATION_APPROVED webhook event
   *
   * Processes approved card authorization events.
   * Updates authorization status and triggers order fulfillment.
   *
   * @async
   * @param {Object} data - Authorization approval data
   * @param {string} data.authorizationId - Unique authorization identifier
   * @param {number} data.authorizedAmount - Approved amount
   * @param {string} data.currency - Currency code
   * @param {string} data.approvalCode - Bank approval code
   * @returns {Promise<Object>} Processing result
   *
   * @example
   * const data = {
   *   authorizationId: 'AUTH123456',
   *   authorizedAmount: 150.00,
   *   currency: 'USD',
   *   approvalCode: '123ABC'
   * };
   * const result = await handler.handleAuthorizationApproved(data);
   *
   * @todo Update authorization status
   * @todo Process order fulfillment
   */
  async handleAuthorizationApproved(data) {
    const startTime = Date.now();
    logger.logFunctionEntry('handleAuthorizationApproved', {
      authorizationId: data.authorizationId,
      amount: data.authorizedAmount,
      approvalCode: data.approvalCode
    }, 'WebhookHandler');

    logger.info('Authorization approved', {
      authorizationId: data.authorizationId,
      amount: data.authorizedAmount,
      approvalCode: data.approvalCode
    });

    // TODO: Update authorization status
    // TODO: Process order fulfillment

    const result = {
      status: 'processed',
      message: 'Authorization approved',
      authorizationId: data.authorizationId
    };

    logger.logFunctionExit('handleAuthorizationApproved', result, startTime, 'WebhookHandler');
    return result;
  }

  /**
   * Handle AUTHORIZATION_DECLINED webhook event
   *
   * Processes declined card authorization events.
   * Records decline reason and notifies users.
   *
   * @async
   * @param {Object} data - Authorization decline data
   * @param {string} data.authorizationId - Unique authorization identifier
   * @param {string} data.declineReason - Reason for decline
   * @param {string} data.declineCode - Bank decline code
   * @param {number} data.attemptedAmount - Amount that was declined
   * @returns {Promise<Object>} Processing result
   *
   * @example
   * const data = {
   *   authorizationId: 'AUTH123456',
   *   declineReason: 'Insufficient funds',
   *   declineCode: 'NSF',
   *   attemptedAmount: 150.00
   * };
   * const result = await handler.handleAuthorizationDeclined(data);
   *
   * @todo Update authorization status
   * @todo Notify user of declined authorization
   */
  async handleAuthorizationDeclined(data) {
    const startTime = Date.now();
    logger.logFunctionEntry('handleAuthorizationDeclined', {
      authorizationId: data.authorizationId,
      declineReason: data.declineReason,
      declineCode: data.declineCode
    }, 'WebhookHandler');

    logger.warn('Authorization declined', {
      authorizationId: data.authorizationId,
      reason: data.declineReason,
      code: data.declineCode,
      attemptedAmount: data.attemptedAmount
    });

    // TODO: Update authorization status
    // TODO: Notify user of declined authorization

    const result = {
      status: 'processed',
      message: 'Authorization decline recorded',
      authorizationId: data.authorizationId,
      reason: data.declineReason
    };

    logger.logFunctionExit('handleAuthorizationDeclined', result, startTime, 'WebhookHandler');
    return result;
  }

  /**
   * Express middleware for webhook endpoint
   *
   * Provides a complete Express middleware function for handling Visa webhooks.
   * Validates signatures, processes events, and sends appropriate responses.
   *
   * Middleware Flow:
   * 1. Extract signature and timestamp from headers
   * 2. Validate signature using HMAC-SHA256
   * 3. Process event and route to appropriate handler
   * 4. Return 200 OK with result or error response
   *
   * @returns {Function} Express middleware function (req, res) => Promise<void>
   *
   * @example
   * // Basic usage
   * const express = require('express');
   * const app = express();
   * const webhookHandler = new WebhookHandler();
   *
   * app.use(express.json());
   * app.post('/webhooks/visa', webhookHandler.middleware());
   *
   * app.listen(3000);
   *
   * @example
   * // With custom error handling
   * app.post('/webhooks/visa',
   *   webhookHandler.middleware(),
   *   (err, req, res, next) => {
   *     logger.error('Webhook error:', err);
   *     res.status(500).json({ error: 'Processing failed' });
   *   }
   * );
   *
   * @example
   * // Expected request format
   * POST /webhooks/visa
   * Headers:
   *   x-visa-signature: "a1b2c3d4..." (Base64 HMAC-SHA256)
   *   x-visa-timestamp: "1703001234" (Unix seconds)
   *   content-type: "application/json"
   * Body:
   *   {
   *     "eventType": "TRANSACTION_COMPLETED",
   *     "data": { "transactionId": "TXN123", "amount": 100.00 }
   *   }
   *
   * Response (200 OK):
   *   {
   *     "received": true,
   *     "result": { "status": "processed", "message": "..." }
   *   }
   *
   * Response (401 Unauthorized):
   *   { "error": "Invalid signature" }
   */
  middleware() {
    return async(req, res) => {
      const startTime = Date.now();
      logger.logFunctionEntry('middleware', {
        method: req.method,
        path: req.path,
        hasBody: !!req.body
      }, 'WebhookHandler');

      try {
        // Get signature and timestamp from headers
        const signature = req.headers['x-visa-signature'];
        const timestamp = req.headers['x-visa-timestamp'];

        if (!signature || !timestamp) {
          logger.warn('Webhook rejected: missing signature or timestamp headers', {
            hasSignature: !!signature,
            hasTimestamp: !!timestamp
          });
          logger.logFunctionExit('middleware', { status: 401, reason: 'missing_headers' }, startTime, 'WebhookHandler');
          return res.status(401).json({
            error: 'Missing signature or timestamp'
          });
        }

        // Validate signature
        const isValid = this.validateSignature(req.body, signature, timestamp);

        if (!isValid) {
          logger.warn('Webhook rejected: invalid signature');
          logger.logFunctionExit('middleware', { status: 401, reason: 'invalid_signature' }, startTime, 'WebhookHandler');
          return res.status(401).json({
            error: 'Invalid signature'
          });
        }

        logger.info('✅ Webhook signature validated successfully');

        // Process event
        const result = await this.processEvent(req.body);

        // Send success response
        const response = {
          received: true,
          result
        };

        logger.info('Webhook processed successfully', { result });
        logger.logFunctionExit('middleware', { status: 200, result }, startTime, 'WebhookHandler');

        res.status(200).json(response);

      } catch (error) {
        logger.logError(error, { path: req.path }, 'WebhookHandler.middleware');
        logger.logFunctionExit('middleware', { status: 500, error: error.message }, startTime, 'WebhookHandler');

        res.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    };
  }
}

module.exports = WebhookHandler;
