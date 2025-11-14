/**
 * TypeScript definitions for Webhook Handler
 */

import { Request, Response } from 'express';

/**
 * Webhook event data
 */
export interface WebhookEventData {
  transactionId?: string;
  authorizationId?: string;
  amount?: number;
  currency?: string;
  failureReason?: string;
  declineReason?: string;
  declineCode?: string;
  approvalCode?: string;
  pendingReason?: string;
  estimatedCompletionTime?: number;
  authorizedAmount?: number;
  attemptedAmount?: number;
}

/**
 * Webhook event
 */
export interface WebhookEvent {
  eventType: 
    | 'TRANSACTION_COMPLETED'
    | 'TRANSACTION_FAILED'
    | 'TRANSACTION_REVERSED'
    | 'TRANSACTION_PENDING'
    | 'AUTHORIZATION_APPROVED'
    | 'AUTHORIZATION_DECLINED';
  data: WebhookEventData;
}

/**
 * Processing result
 */
export interface ProcessingResult {
  status: 'processed' | 'ignored';
  message: string;
  transactionId?: string;
  authorizationId?: string;
  reason?: string;
}

/**
 * Webhook signature result
 */
export interface WebhookSignature {
  signature: string;
  timestamp: string;
}

/**
 * Webhook Handler Class
 */
export default class WebhookHandler {
  sharedSecret: string;

  constructor();

  /**
   * Validate webhook signature using HMAC-SHA256
   */
  validateSignature(
    payload: Record<string, any> | string,
    signature: string,
    timestamp: string
  ): boolean;

  /**
   * Generate webhook signature for testing purposes
   */
  generateSignature(
    payload: Record<string, any> | string,
    timestamp?: string | null
  ): WebhookSignature;

  /**
   * Process webhook event and route to appropriate handler
   */
  processEvent(event: WebhookEvent): Promise<ProcessingResult>;

  /**
   * Handle TRANSACTION_COMPLETED webhook event
   */
  handleTransactionCompleted(data: WebhookEventData): Promise<ProcessingResult>;

  /**
   * Handle TRANSACTION_FAILED webhook event
   */
  handleTransactionFailed(data: WebhookEventData): Promise<ProcessingResult>;

  /**
   * Handle TRANSACTION_REVERSED webhook event
   */
  handleTransactionReversed(data: WebhookEventData): Promise<ProcessingResult>;

  /**
   * Handle TRANSACTION_PENDING webhook event
   */
  handleTransactionPending(data: WebhookEventData): Promise<ProcessingResult>;

  /**
   * Handle AUTHORIZATION_APPROVED webhook event
   */
  handleAuthorizationApproved(data: WebhookEventData): Promise<ProcessingResult>;

  /**
   * Handle AUTHORIZATION_DECLINED webhook event
   */
  handleAuthorizationDeclined(data: WebhookEventData): Promise<ProcessingResult>;

  /**
   * Express middleware for webhook endpoint
   */
  middleware(): (req: Request, res: Response) => Promise<void>;
}
