import Stripe from 'stripe';
import config from '../config/index.js';
import { createOrder, updateOrderStatus, getOrderByProviderId } from '../models/database.js';

const stripe = new Stripe(config.stripe.secretKey);

/**
 * Creates a Stripe Checkout Session for ebook purchase.
 * Enforces 15-minute session expiry, fixed amount of 89.99 PLN, and supports BLIK, card, and P24.
 *
 * @param {object} [options]
 * @param {string} [options.customerEmail] - Pre-fill customer email in checkout
 * @returns {Promise<{ sessionId: string, url: string }>}
 */
export async function createCheckoutSession({ customerEmail } = {}) {
  const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60; // 15 minutes from now

  const sessionParams = {
    payment_method_types: ['blik', 'card', 'p24'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'pln',
          product_data: {
            name: 'AI w IT: Praktyczny Przewodnik dla Początkujących',
            description: 'E-book w formacie PDF — praktyczny przewodnik po narzędziach AI dla specjalistów IT',
          },
          unit_amount: 8999,
        },
        quantity: 1,
      },
    ],
    expires_at: expiresAt,
    success_url: `${config.baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.baseUrl}/error.html?reason=cancelled`,
  };

  if (customerEmail) {
    sessionParams.customer_email = customerEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Handles incoming Stripe webhook events.
 * Verifies the signature, processes checkout.session.completed events,
 * and creates/updates orders in the database.
 *
 * @param {Buffer|string} payload - Raw request body
 * @param {string} signature - Stripe-Signature header value
 * @returns {Promise<{ success: boolean, orderId?: string, error?: string }>}
 */
export async function handleWebhook(payload, signature) {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe.webhookSecret
    );
  } catch (err) {
    return {
      success: false,
      error: `Webhook signature verification failed: ${err.message}`,
    };
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Idempotency check — skip if order already exists and is completed
    const existingOrder = getOrderByProviderId(session.id);
    if (existingOrder && existingOrder.status === 'completed') {
      return {
        success: true,
        orderId: existingOrder.id,
      };
    }

    if (existingOrder) {
      // Order exists but not completed — update status
      updateOrderStatus(existingOrder.id, 'completed', {
        paymentMethod: session.payment_method_types?.[0] || null,
      });

      return {
        success: true,
        orderId: existingOrder.id,
      };
    }

    // Create new order
    const order = createOrder({
      paymentProvider: 'stripe',
      providerOrderId: session.id,
      customerEmail: session.customer_details?.email || session.customer_email || null,
      amount: session.amount_total || 8999,
      currency: (session.currency || 'pln').toUpperCase(),
      paymentMethod: session.payment_method_types?.[0] || null,
    });

    // Mark as completed immediately since webhook confirms payment
    updateOrderStatus(order.id, 'completed', {
      paymentMethod: session.payment_method_types?.[0] || null,
    });

    return {
      success: true,
      orderId: order.id,
    };
  }

  // Acknowledge other event types without processing
  return {
    success: true,
  };
}
