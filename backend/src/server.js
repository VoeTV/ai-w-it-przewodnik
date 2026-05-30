import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import paymentsRouter from './routes/payments.js';
import webhooksRouter from './routes/webhooks.js';
import downloadsRouter from './routes/downloads.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Security headers ---
app.use(helmet());

// --- CORS ---
app.use(cors({
  origin: config.baseUrl,
  methods: ['GET', 'POST'],
}));

// --- HTTPS enforcement middleware for payment endpoints ---
// Prevents payment form submission on non-HTTPS connections (Requirement 6.1, 6.5)
app.use('/api/create-checkout-session', enforceHttps);
app.use('/api/create-revolut-order', enforceHttps);
app.use('/api/create-paypal-order', enforceHttps);
app.use('/api/capture-paypal-order', enforceHttps);

function enforceHttps(req, res, next) {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

  if (!isSecure && process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Połączenie nie jest bezpieczne. Płatności wymagają szyfrowanego połączenia HTTPS.',
    });
  }

  next();
}

// --- Webhook routes (mounted BEFORE global JSON parser) ---
// Webhooks handle their own body parsing (raw/text) for signature verification
app.use('/api/webhooks', webhooksRouter);

// --- JSON body parser for all other routes ---
app.use(express.json());

// --- API routes ---
app.use('/api', paymentsRouter);
app.use('/api', downloadsRouter);

// --- Serve static files from landing-page directory ---
const landingPagePath = path.resolve(__dirname, '../../landing-page');
app.use(express.static(landingPagePath));

// --- Start server ---
const server = app.listen(config.port, () => {
  console.log(`[server] Running on port ${config.port}`);
});

export { app, server };
