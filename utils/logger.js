/**
 * Comprehensive Logging Utility for SAF VisaNet Connector
 *
 * Provides centralized logging with:
 * - Multiple log levels (error, warn, info, debug)
 * - Automatic log rotation
 * - Structured logging format
 * - Entry/exit function tracing
 * - Performance monitoring
 * - Error stack traces
 * - Request/response logging
 *
 * @module utils/logger
 * @requires winston
 * @requires winston-daily-rotate-file
 *
 * @example
 * const logger = require('./utils/logger');
 *
 * logger.info('Application started');
 * logger.error('Error occurred', { error: err });
 * logger.logFunctionEntry('myFunction', { param1: 'value1' });
 * logger.logFunctionExit('myFunction', { result: 'success' });
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

/**
 * Custom log format with timestamp, level, and structured data
 * @constant {winston.Logform.Format}
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }

    return msg;
  })
);

/**
 * Console transport for development with colorized output
 * @constant {winston.transports.ConsoleTransportInstance}
 */
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
  level: process.env.LOG_LEVEL || 'info'
});

/**
 * Daily rotate file transport for all logs
 * @constant {DailyRotateFile}
 */
const fileTransport = new DailyRotateFile({
  filename: path.join(process.env.LOG_DIR || './logs', 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: process.env.LOG_MAX_SIZE || '20m',
  maxFiles: process.env.LOG_MAX_FILES || '30d',
  format: logFormat,
  level: 'debug'
});

/**
 * Daily rotate file transport for error logs only
 * @constant {DailyRotateFile}
 */
const errorFileTransport = new DailyRotateFile({
  filename: path.join(process.env.LOG_DIR || './logs', 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: process.env.LOG_MAX_SIZE || '20m',
  maxFiles: process.env.LOG_MAX_FILES || '30d',
  format: logFormat,
  level: 'error'
});

/**
 * Winston logger instance with multiple transports
 * @constant {winston.Logger}
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    consoleTransport,
    fileTransport,
    errorFileTransport
  ],
  exitOnError: false
});

/**
 * Log function entry with parameters
 * Useful for debugging and tracing execution flow
 *
 * @param {string} functionName - Name of the function being entered
 * @param {Object} [params={}] - Function parameters (sensitive data will be masked)
 * @param {string} [module=''] - Module or class name
 * @returns {void}
 *
 * @example
 * logger.logFunctionEntry('processPayment', { amount: 100, currency: 'USD' }, 'PaymentService');
 * // Output: 2025-11-14 16:30:00.123 [DEBUG]: → ENTER PaymentService.processPayment {"amount":100,"currency":"USD"}
 */
logger.logFunctionEntry = function(functionName, params = {}, module = '') {
  const maskedParams = maskSensitiveData(params);
  const fullName = module ? `${module}.${functionName}` : functionName;

  this.debug(`→ ENTER ${fullName}`, { params: maskedParams });
};

/**
 * Log function exit with return value and execution time
 *
 * @param {string} functionName - Name of the function being exited
 * @param {*} [result=null] - Function return value (sensitive data will be masked)
 * @param {number} [startTime=null] - Function start time from Date.now() for performance tracking
 * @param {string} [module=''] - Module or class name
 * @returns {void}
 *
 * @example
 * const startTime = Date.now();
 * // ... function logic
 * logger.logFunctionExit('processPayment', { success: true }, startTime, 'PaymentService');
 * // Output: 2025-11-14 16:30:00.456 [DEBUG]: ← EXIT PaymentService.processPayment (took 333ms) {"success":true}
 */
logger.logFunctionExit = function(functionName, result = null, startTime = null, module = '') {
  const maskedResult = maskSensitiveData(result);
  const fullName = module ? `${module}.${functionName}` : functionName;

  let message = `← EXIT ${fullName}`;

  // Add execution time if startTime provided
  if (startTime) {
    const duration = Date.now() - startTime;
    message += ` (took ${duration}ms)`;
  }

  this.debug(message, { result: maskedResult });
};

/**
 * Log API request details
 *
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} url - Request URL
 * @param {Object} [headers={}] - Request headers (auth headers will be masked)
 * @param {Object} [body=null] - Request body (sensitive data will be masked)
 * @returns {void}
 *
 * @example
 * logger.logApiRequest('POST', '/api/v1/transactions', headers, requestBody);
 */
logger.logApiRequest = function(method, url, headers = {}, body = null) {
  const maskedHeaders = maskSensitiveData(headers);
  const maskedBody = maskSensitiveData(body);

  this.info(`→ API REQUEST ${method} ${url}`, {
    headers: maskedHeaders,
    body: maskedBody
  });
};

/**
 * Log API response details
 *
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {number} statusCode - HTTP status code
 * @param {Object} [body=null] - Response body (sensitive data will be masked)
 * @param {number} [duration=null] - Request duration in milliseconds
 * @returns {void}
 *
 * @example
 * logger.logApiResponse('POST', '/api/v1/transactions', 200, responseBody, 450);
 */
logger.logApiResponse = function(method, url, statusCode, body = null, duration = null) {
  const maskedBody = maskSensitiveData(body);
  const level = statusCode >= 400 ? 'error' : 'info';

  let message = `← API RESPONSE ${method} ${url} [${statusCode}]`;
  if (duration) {
    message += ` (${duration}ms)`;
  }

  this[level](message, { body: maskedBody });
};

/**
 * Log error with full stack trace and context
 *
 * @param {Error} error - Error object
 * @param {Object} [context={}] - Additional context about the error
 * @param {string} [functionName=''] - Function where error occurred
 * @returns {void}
 *
 * @example
 * try {
 *   // some code
 * } catch (error) {
 *   logger.logError(error, { transactionId: '123' }, 'processPayment');
 * }
 */
logger.logError = function(error, context = {}, functionName = '') {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
    ...context
  };

  const logMessage = functionName
    ? `Error in ${functionName}: ${error.message}`
    : `Error: ${error.message}`;

  this.error(logMessage, errorInfo);
};

/**
 * Log database query for debugging
 *
 * @param {string} query - SQL query or operation description
 * @param {Object} [params={}] - Query parameters
 * @param {number} [duration=null] - Query execution time in milliseconds
 * @returns {void}
 *
 * @example
 * logger.logDatabaseQuery('SELECT * FROM transactions WHERE id = ?', { id: '123' }, 45);
 */
logger.logDatabaseQuery = function(query, params = {}, duration = null) {
  const maskedParams = maskSensitiveData(params);

  let message = `DATABASE QUERY: ${query}`;
  if (duration) {
    message += ` (${duration}ms)`;
  }

  this.debug(message, { params: maskedParams });
};

/**
 * Log webhook event
 *
 * @param {string} eventType - Type of webhook event
 * @param {Object} payload - Event payload (sensitive data will be masked)
 * @param {string} [signature=''] - Webhook signature for verification
 * @returns {void}
 *
 * @example
 * logger.logWebhook('TRANSACTION_COMPLETED', webhookPayload, signatureHeader);
 */
logger.logWebhook = function(eventType, payload, signature = '') {
  const maskedPayload = maskSensitiveData(payload);

  this.info(`WEBHOOK RECEIVED: ${eventType}`, {
    payload: maskedPayload,
    signaturePresent: !!signature
  });
};

/**
 * Mask sensitive data in objects before logging
 * Prevents exposure of PII, PCI, and authentication data
 *
 * @private
 * @param {*} data - Data to mask (object, array, or primitive)
 * @returns {*} Masked copy of the data
 *
 * @example
 * const masked = maskSensitiveData({ cardNumber: '4111111111111111' });
 * // Returns: { cardNumber: '****1111' }
 */
function maskSensitiveData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Sensitive field names to mask
  const sensitiveFields = [
    'password', 'pass', 'pwd', 'secret', 'token', 'apikey', 'api_key',
    'authorization', 'auth', 'cardnumber', 'card_number', 'cvv', 'cvc',
    'pan', 'pin', 'ssn', 'private_key', 'privatekey', 'sharedSecret'
  ];

  // Create deep copy
  const masked = Array.isArray(data) ? [...data] : { ...data };

  for (const key in masked) {
    const lowerKey = key.toLowerCase().replace(/[_-]/g, '');

    // Check if field should be masked
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      const value = masked[key];

      if (typeof value === 'string') {
        if (value.length <= 4) {
          masked[key] = '****';
        } else if (lowerKey.includes('card') || lowerKey.includes('pan')) {
          // Show last 4 digits for card numbers
          masked[key] = '****' + value.slice(-4);
        } else {
          // Show first 4 chars for other sensitive data
          masked[key] = value.substring(0, 4) + '****';
        }
      } else {
        masked[key] = '****';
      }
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      // Recursively mask nested objects
      masked[key] = maskSensitiveData(masked[key]);
    }
  }

  return masked;
}

/**
 * Create a child logger with a specific module name
 * Useful for adding context to all logs from a specific module
 *
 * @param {string} moduleName - Name of the module
 * @returns {winston.Logger} Child logger instance
 *
 * @example
 * const paymentLogger = logger.child('PaymentService');
 * paymentLogger.info('Processing payment'); // Outputs: [PaymentService] Processing payment
 */
logger.child = function(moduleName) {
  return winston.createLogger({
    level: this.level,
    format: winston.format.combine(
      winston.format.label({ label: moduleName }),
      this.format
    ),
    transports: this.transports
  });
};

// Handle uncaught exceptions
logger.exceptions.handle(
  new DailyRotateFile({
    filename: path.join(process.env.LOG_DIR || './logs', 'exceptions-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d'
  })
);

// Handle unhandled promise rejections
logger.rejections.handle(
  new DailyRotateFile({
    filename: path.join(process.env.LOG_DIR || './logs', 'rejections-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d'
  })
);

module.exports = logger;
