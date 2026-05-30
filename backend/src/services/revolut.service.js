import crypto from 'crypto';
import config from '../config/index.js';
import { createOrder as dbCreateOrder, getOrderByProviderId, updateOrderStatus } from '../models/database.js';

const REVOLUT_API_URL = 'https://sandbox-merchant.revolut.com/api/1.0/orders';

/**
 * Creates a Revolut order via the Merchant API.
 * Amount is always 8999 (grosze) and currency is always PLN.
 *
 * @param {object} params
 * @param {string} [params.customerEmail] - Buyer's email address
 * @param {string} [params.description] - Order description
 * @returns {Promise<{ orderId: string, token: string }>}
 */
export async function createOrder({ customerEmail, description = 'AI w IT: Praktyczny Przewodnik dla Początkujących' } = {}) {
  const body = {
    amount: 8999,
    currency: 'PLN',
    description,
  };

  if (customerEmail) {
    body.customer_email = customerEmail;
  }

  const response = await fetch(REVOLUT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.revolut.apiKey}`,
      'Revolut-Api-Version': '2024-09-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Revolut API error (${response.status}): ${errorData}`);
  }

  const data = await response.json();

  // Store order in database
  dbCreateOrder({
    paymentProvider: 'revolut',
    providerOrderId: data.id,
    customerEmail: customerEmail || null,
    amount: 8999,
    currency: 'PLN',
    paymentMethod: 'revolut_pay',
  });

  return {
    orderId: data.id,
    token: data.token,
  };
}

/**
 * Verifies the Revolut webhook signature using HMAC-SHA256.
 *
 * @param {string} payload - Raw request body as string
 * @param {string} signature - Value of the Revolut-Signature header
 * @returns {boolean}
 */
export function verifyWebhookSignature(payload, signature) {
  if (!signature || !payload) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', config.revolut.webhookSecret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Handles a Revolut webhook event.
 * Verifies signature, processes ORDER_COMPLETED events, and updates order status.
 *
 * @param {object} payload - Parsed webhook payload
 * @param {string} signature - Revolut-Signature header value
 * @param {string} rawBody - Raw request body string for signature verification
 * @returns {Promise<{ success: boolean, orderId?: string, error?: string }>}
 */
export async function handleWebhook(payload, signature, rawBody) {
  // Verify webhook signature
  if (!verifyWebhookSignature(rawBody, signature)) {
    return { success: false, error: 'Invalid webhook signature' };
  }

  const event = payload.event;
  const orderId = payload.order_id;

  // Only process ORDER_COMPLETED events
  if (event !== 'ORDER_COMPLETED') {
    return { success: true, orderId };
  }

  // Check if order exists in database
  const existingOrder = getOrderByProviderId(orderId);

  if (!existingOrder) {
    return { success: false, error: `Order not found: ${orderId}` };
  }

  // Idempotent: if already completed, return success without re-processing
  if (existingOrder.status === 'completed') {
    return { success: true, orderId: existingOrder.id };
  }

  // Update order status to completed
  updateOrderStatus(existingOrder.id, 'completed', {
    paymentMethod: 'revolut_pay',
  });

  return { success: true, orderId: existingOrder.id };
}
