import { Router } from 'express';
import { validateAndServe } from '../services/download.service.js';
import { getOrderByProviderId, db } from '../models/database.js';

const router = Router();

/**
 * GET /api/download-token?session_id=X
 * Looks up the download token for a given Stripe session ID or provider order ID.
 * Used by download.html to resolve a session_id into a download token after webhook processing.
 */
router.get('/download-token', (req, res) => {
  const { session_id: sessionId } = req.query;

  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session_id parameter' });
  }

  // Find the order by provider order ID (session_id for Stripe, order ID for Revolut/PayPal)
  const order = getOrderByProviderId(sessionId);

  if (!order) {
    // Order not found yet — webhook may not have been processed
    return res.status(404).json({ error: 'Order not found', token: null });
  }

  // Look up the download token for this order
  const tokenRecord = db.prepare('SELECT * FROM download_tokens WHERE order_id = ?').get(order.id);

  if (!tokenRecord) {
    // Order exists but token not yet created — webhook still processing
    return res.status(202).json({ error: 'Token not ready yet', token: null });
  }

  return res.status(200).json({
    token: tokenRecord.token,
    expiresAt: tokenRecord.expires_at,
    remainingAttempts: tokenRecord.max_downloads - tokenRecord.download_count,
  });
});

/**
 * GET /api/download/:token
 * Validates the download token and serves the PDF file.
 * Returns appropriate error responses for expired, maxed, or invalid tokens.
 */
router.get('/download/:token', (req, res) => {
  const { token } = req.params;

  const result = validateAndServe(token);

  if (!result.valid) {
    const acceptsJson = req.accepts('json', 'html') === 'json';

    switch (result.error) {
      case 'not_found':
        if (acceptsJson) {
          return res.status(404).json({
            error: 'Nieprawidłowy link do pobrania.',
          });
        }
        return res.status(404).send(errorPage('Nieprawidłowy link do pobrania.'));

      case 'expired':
        if (acceptsJson) {
          return res.status(410).json({
            error: 'Link do pobrania wygasł. Skontaktuj się z nami, aby otrzymać nowy link.',
          });
        }
        return res.status(410).send(
          errorPage('Link do pobrania wygasł. Skontaktuj się z nami, aby otrzymać nowy link.')
        );

      case 'max_attempts':
        if (acceptsJson) {
          return res.status(410).json({
            error: 'Wykorzystano maksymalną liczbę pobrań. Skontaktuj się z nami po nowy link.',
          });
        }
        return res.status(410).send(
          errorPage('Wykorzystano maksymalną liczbę pobrań. Skontaktuj się z nami po nowy link.')
        );

      case 'server_error':
      default:
        if (acceptsJson) {
          return res.status(503).json({
            error: 'Wystąpił tymczasowy problem. Spróbuj ponownie za chwilę.',
          });
        }
        return res.status(503).send(
          errorPage('Wystąpił tymczasowy problem. Spróbuj ponownie za chwilę.')
        );
    }
  }

  // Serve the PDF file
  const filename = 'ai-w-it-przewodnik.pdf';

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  return res.sendFile(result.filePath, (err) => {
    if (err && !res.headersSent) {
      return res.status(503).json({
        error: 'Wystąpił tymczasowy problem. Spróbuj ponownie za chwilę.',
      });
    }
  });
});

/**
 * Generates a simple HTML error page for browser users.
 * @param {string} message - The error message to display
 * @returns {string} HTML string
 */
function errorPage(message) {
  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Błąd pobierania</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8f9fa; color: #333; }
    .container { text-align: center; padding: 2rem; max-width: 480px; }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; }
    p { line-height: 1.6; color: #555; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Błąd pobierania</h1>
    <p>${message}</p>
    <p><a href="/">Powrót do strony głównej</a></p>
  </div>
</body>
</html>`;
}

export default router;
