import { Router } from 'express';
import { createCheckoutSession } from '../services/stripe.service.js';
import { createOrder as createRevolutOrder } from '../services/revolut.service.js';
import { createOrder as createPayPalOrder, captureOrder as capturePayPalOrder } from '../services/paypal.service.js';
import { getErrorMessage } from '../services/error-mapping.js';
import { createDownloadToken, getOrderByProviderId, db } from '../models/database.js';
import config from '../config/index.js';

// Gracefully handle email service import
let sendPurchaseConfirmation = null;
try {
  const emailModule = await import('../services/email.service.js');
  sendPurchaseConfirmation = emailModule.sendPurchaseConfirmation || emailModule.default;
} catch {
  // Email service not yet available
}

const router = Router();

/**
 * POST /api/create-checkout-session
 * Creates a Stripe Checkout Session for BLIK + card payments.
 * Body: { email?: string }
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { email } = req.body || {};

    const result = await createCheckoutSession({ customerEmail: email });

    return res.status(200).json({
      sessionId: result.sessionId,
      url: result.url,
    });
  } catch (error) {
    const errorInfo = getErrorMessage('stripe', error.code || 'processing_error');
    return res.status(500).json({
      error: errorInfo.message,
      canRetry: errorInfo.canRetry,
      showAlternatives: errorInfo.showAlternatives,
    });
  }
});

/**
 * POST /api/create-revolut-order
 * Creates a Revolut order via the Merchant API.
 * Body: { email?: string, description?: string }
 */
router.post('/create-revolut-order', async (req, res) => {
  try {
    const { email, description } = req.body || {};

    const result = await createRevolutOrder({ customerEmail: email, description });

    return res.status(200).json({
      orderId: result.orderId,
      token: result.token,
    });
  } catch (error) {
    const errorInfo = getErrorMessage('revolut', error.code || 'FAILED');
    return res.status(500).json({
      error: errorInfo.message,
      canRetry: errorInfo.canRetry,
      showAlternatives: errorInfo.showAlternatives,
    });
  }
});

/**
 * POST /api/create-paypal-order
 * Creates a PayPal order for checkout.
 * Body: (no required fields)
 */
router.post('/create-paypal-order', async (req, res) => {
  try {
    const result = await createPayPalOrder();

    return res.status(200).json({
      orderId: result.orderId,
    });
  } catch (error) {
    const errorInfo = getErrorMessage('paypal', error.code || 'INSTRUMENT_DECLINED');
    return res.status(500).json({
      error: errorInfo.message,
      canRetry: errorInfo.canRetry,
      showAlternatives: errorInfo.showAlternatives,
    });
  }
});

/**
 * POST /api/capture-paypal-order
 * Captures an approved PayPal order after buyer approval.
 * Body: { orderId: string }
 */
router.post('/capture-paypal-order', async (req, res) => {
  try {
    const { orderId } = req.body || {};

    if (!orderId) {
      return res.status(400).json({
        error: 'Brak identyfikatora zamówienia PayPal. Spróbuj ponownie.',
      });
    }

    const result = await capturePayPalOrder(orderId);

    if (!result.success) {
      const errorInfo = getErrorMessage('paypal', result.error || 'ORDER_NOT_APPROVED');
      return res.status(422).json({
        error: errorInfo.message,
        canRetry: errorInfo.canRetry,
        showAlternatives: errorInfo.showAlternatives,
      });
    }

    // PayPal capture succeeded — create download token (post-payment action)
    const dbOrder = getOrderByProviderId(orderId);
    if (dbOrder) {
      // Idempotency: check if token already exists
      const existingToken = db.prepare('SELECT token FROM download_tokens WHERE order_id = ?').get(dbOrder.id);
      if (!existingToken) {
        const tokenData = createDownloadToken(dbOrder.id);
        const downloadUrl = `${config.baseUrl}/api/download/${tokenData.token}`;

        // Send confirmation email (non-blocking)
        if (sendPurchaseConfirmation && dbOrder.customer_email) {
          sendPurchaseConfirmation({
            to: dbOrder.customer_email,
            downloadUrl,
            transactionId: dbOrder.id,
            amount: '89,99 PLN',
            paymentMethod: 'paypal',
          }).catch((err) => {
            console.error('[payments/paypal] Failed to send confirmation email:', err.message);
          });
        }
      }
    }

    return res.status(200).json({
      orderId: result.orderId,
      transactionId: result.transactionId,
    });
  } catch (error) {
    const errorInfo = getErrorMessage('paypal', error.code || 'INSTRUMENT_DECLINED');
    return res.status(500).json({
      error: errorInfo.message,
      canRetry: errorInfo.canRetry,
      showAlternatives: errorInfo.showAlternatives,
    });
  }
});

export default router;
