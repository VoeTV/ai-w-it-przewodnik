import { Router } from 'express';
import express from 'express';
import { handleWebhook as handleStripeWebhook } from '../services/stripe.service.js';
import { handleWebhook as handleRevolutWebhook } from '../services/revolut.service.js';
import { createDownloadToken, db } from '../models/database.js';
import config from '../config/index.js';

// Gracefully handle email service import — it may not exist yet
let sendPurchaseConfirmation = null;
try {
  const emailModule = await import('../services/email.service.js');
  sendPurchaseConfirmation = emailModule.sendPurchaseConfirmation || emailModule.default;
} catch {
  // Email service not yet implemented — webhook will still work
  console.warn('[webhooks] Email service not available — confirmation emails will be skipped.');
}

const router = Router();

/**
 * Generates a download token and sends a confirmation email.
 * Email failures are logged but do not cause the webhook to fail.
 *
 * @param {string} orderId - Internal order ID
 * @param {string|null} customerEmail - Buyer's email address
 * @param {string} paymentMethod - Payment method used
 */
async function postPaymentActions(orderId, customerEmail, paymentMethod) {
  // Idempotency: check if a download token already exists for this order
  const existingToken = db.prepare('SELECT token FROM download_tokens WHERE order_id = ?').get(orderId);
  if (existingToken) {
    // Already processed — skip duplicate token creation
    return { downloadUrl: `${config.baseUrl}/api/download/${existingToken.token}`, token: existingToken.token };
  }

  // Generate download token
  const tokenData = createDownloadToken(orderId);
  const downloadUrl = `${config.baseUrl}/api/download/${tokenData.token}`;

  // Send confirmation email (non-blocking — don't fail webhook if email fails)
  if (sendPurchaseConfirmation && customerEmail) {
    try {
      await sendPurchaseConfirmation({
        to: customerEmail,
        downloadUrl,
        transactionId: orderId,
        amount: '89,99 PLN',
        paymentMethod,
      });
    } catch (emailError) {
      console.error('[webhooks] Failed to send confirmation email:', emailError.message);
    }
  }

  return { downloadUrl, token: tokenData.token };
}

// --- Stripe Webhook ---
// Stripe requires the raw body as a Buffer for signature verification.
// This route uses express.raw() middleware instead of the global JSON parser.
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(401).json({ error: 'Missing Stripe-Signature header' });
    }

    try {
      const result = await handleStripeWebhook(req.body, signature);

      if (!result.success) {
        // Signature verification failed
        if (result.error && result.error.includes('signature')) {
          return res.status(401).json({ error: result.error });
        }
        return res.status(400).json({ error: result.error });
      }

      // If an orderId was returned, payment was completed — run post-payment actions
      if (result.orderId) {
        const customerEmail = req.body.toString
          ? (() => {
              try {
                const parsed = JSON.parse(req.body.toString());
                return parsed?.data?.object?.customer_details?.email ||
                       parsed?.data?.object?.customer_email || null;
              } catch { return null; }
            })()
          : null;

        await postPaymentActions(result.orderId, customerEmail, 'stripe');
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error('[webhooks/stripe] Unexpected error:', error.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// --- Revolut Webhook ---
// Revolut requires the raw body string for HMAC signature verification.
// We use express.text() to get the raw body, then parse JSON manually.
router.post(
  '/revolut',
  express.text({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['revolut-signature'];

    if (!signature) {
      return res.status(401).json({ error: 'Missing Revolut-Signature header' });
    }

    let payload;
    try {
      payload = JSON.parse(req.body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    const rawBody = req.body; // string for signature verification

    try {
      const result = await handleRevolutWebhook(payload, signature, rawBody);

      if (!result.success) {
        if (result.error && result.error.includes('signature')) {
          return res.status(401).json({ error: result.error });
        }
        return res.status(400).json({ error: result.error });
      }

      // If an orderId was returned, payment was completed — run post-payment actions
      if (result.orderId) {
        const customerEmail = payload.customer_email || payload.email || null;
        await postPaymentActions(result.orderId, customerEmail, 'revolut_pay');
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error('[webhooks/revolut] Unexpected error:', error.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// --- PayPal Webhook (optional) ---
// PayPal primarily uses the capture flow (client-side capture + server verification).
// This endpoint is provided for PayPal IPN/webhook notifications if configured.
router.post(
  '/paypal',
  express.json(),
  async (req, res) => {
    const eventType = req.body?.event_type;

    // PayPal uses capture flow — this webhook is supplementary
    if (eventType !== 'PAYMENT.CAPTURE.COMPLETED') {
      return res.status(200).json({ received: true });
    }

    try {
      const capture = req.body?.resource;
      const orderId = capture?.supplementary_data?.related_ids?.order_id || capture?.id;

      if (!orderId) {
        return res.status(400).json({ error: 'Missing order ID in payload' });
      }

      // PayPal capture is already handled in the captureOrder flow,
      // so this webhook serves as a backup confirmation.
      // The captureOrder function already marks the order as completed.
      return res.status(200).json({ received: true });
    } catch (error) {
      console.error('[webhooks/paypal] Unexpected error:', error.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
