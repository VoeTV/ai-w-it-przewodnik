import paypal from '@paypal/checkout-server-sdk';
import config from '../config/index.js';
import { createOrder as dbCreateOrder, getOrderByProviderId, updateOrderStatus } from '../models/database.js';

// --- PayPal Environment Setup ---

function createPayPalClient() {
  const environment = new paypal.core.SandboxEnvironment(
    config.paypal.clientId,
    config.paypal.clientSecret
  );
  return new paypal.core.PayPalHttpClient(environment);
}

const client = createPayPalClient();

// --- Service Functions ---

/**
 * Creates a PayPal order with amount 89.99 PLN and stores it in the database.
 * @returns {Promise<{ orderId: string }>} The PayPal order ID
 */
export async function createOrder() {
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: 'PLN',
          value: '89.99',
        },
        description: 'AI w IT: Praktyczny Przewodnik dla Początkujących',
      },
    ],
  });

  const response = await client.execute(request);
  const paypalOrderId = response.result.id;

  // Store order in database with status 'pending'
  dbCreateOrder({
    paymentProvider: 'paypal',
    providerOrderId: paypalOrderId,
    customerEmail: null,
    amount: 8999,
    currency: 'PLN',
    paymentMethod: 'paypal',
  });

  return { orderId: paypalOrderId };
}

/**
 * Captures an approved PayPal order and updates the database.
 * @param {string} orderId - The PayPal order ID to capture
 * @returns {Promise<CaptureResult>} Result with success status, orderId, and transactionId
 */
export async function captureOrder(orderId) {
  try {
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    const response = await client.execute(request);
    const captureResult = response.result;

    const transactionId =
      captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;

    // Update order status in database
    const dbOrder = getOrderByProviderId(orderId);
    if (dbOrder) {
      updateOrderStatus(dbOrder.id, 'completed', {
        paymentMethod: 'paypal',
      });
    }

    return {
      success: true,
      orderId,
      transactionId,
    };
  } catch (error) {
    return {
      success: false,
      orderId,
      error: error.message || 'PayPal capture failed',
    };
  }
}
