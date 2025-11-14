/**
 * TypeScript definitions for Winston Logger
 */

import { Logger } from 'winston';

/**
 * Log metadata
 */
export interface LogMetadata {
  [key: string]: any;
}

/**
 * API request log data
 */
export interface ApiRequestLog {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
}

/**
 * API response log data
 */
export interface ApiResponseLog {
  status: number;
  statusText?: string;
  data?: any;
  headers?: Record<string, any>;
}

/**
 * Database query log data
 */
export interface DbQueryLog {
  operation: string;
  collection?: string;
  query?: any;
  duration?: number;
}

/**
 * Webhook log data
 */
export interface WebhookLog {
  eventType?: string;
  [key: string]: any;
}

/**
 * Winston Logger Instance
 */
declare const logger: Logger & {
  /**
   * Log function entry with parameters
   */
  logFunctionEntry(
    functionName: string,
    params: LogMetadata,
    className?: string
  ): void;

  /**
   * Log function exit with result and duration
   */
  logFunctionExit(
    functionName: string,
    result: any,
    startTime: number,
    className?: string
  ): void;

  /**
   * Log API request
   */
  logApiRequest(request: ApiRequestLog): void;

  /**
   * Log API response
   */
  logApiResponse(
    response: ApiResponseLog,
    duration: number,
    request: ApiRequestLog
  ): void;

  /**
   * Log error with stack trace and context
   */
  logError(
    error: Error,
    context: LogMetadata,
    functionName?: string
  ): void;

  /**
   * Log webhook event
   */
  logWebhook(
    webhookData: WebhookLog,
    direction: 'incoming' | 'outgoing'
  ): void;

  /**
   * Log database query
   */
  logDbQuery(queryData: DbQueryLog): void;
};

export default logger;
