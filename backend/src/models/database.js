import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'ebook.sqlite');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- Schema initialization ---

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    payment_provider TEXT NOT NULL,
    provider_order_id TEXT NOT NULL,
    customer_email TEXT,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PLN',
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    metadata TEXT
  );

  CREATE TABLE IF NOT EXISTS download_tokens (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    token TEXT NOT NULL UNIQUE,
    download_count INTEGER DEFAULT 0,
    max_downloads INTEGER DEFAULT 5,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_downloaded_at DATETIME
  );

  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_provider_id ON orders(provider_order_id);
  CREATE INDEX IF NOT EXISTS idx_download_tokens_token ON download_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_download_tokens_order ON download_tokens(order_id);
`);

// --- CRUD Functions ---

/**
 * Creates a new order record.
 */
export function createOrder({ paymentProvider, providerOrderId, customerEmail, amount, currency = 'PLN', paymentMethod = null, metadata = null }) {
  const id = uuidv4();
  const metadataJson = metadata ? JSON.stringify(metadata) : null;

  const stmt = db.prepare(`
    INSERT INTO orders (id, payment_provider, provider_order_id, customer_email, amount, currency, status, payment_method, metadata)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `);

  stmt.run(id, paymentProvider, providerOrderId, customerEmail, amount, currency, paymentMethod, metadataJson);

  return { id, paymentProvider, providerOrderId, customerEmail, amount, currency, status: 'pending', paymentMethod, metadata };
}

/**
 * Updates the status of an order.
 */
export function updateOrderStatus(orderId, status, { paymentMethod = null, completedAt = null } = {}) {
  const updates = ['status = ?'];
  const params = [status];

  if (paymentMethod) {
    updates.push('payment_method = ?');
    params.push(paymentMethod);
  }

  if (completedAt || status === 'completed') {
    updates.push('completed_at = ?');
    params.push(completedAt || new Date().toISOString());
  }

  params.push(orderId);

  const stmt = db.prepare(`
    UPDATE orders SET ${updates.join(', ')} WHERE id = ?
  `);

  const result = stmt.run(...params);
  return result.changes > 0;
}

/**
 * Retrieves an order by its provider-specific order ID.
 */
export function getOrderByProviderId(providerOrderId) {
  const stmt = db.prepare('SELECT * FROM orders WHERE provider_order_id = ?');
  const row = stmt.get(providerOrderId);

  if (!row) return null;

  return {
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  };
}

/**
 * Creates a download token for a completed order.
 */
export function createDownloadToken(orderId, { maxDownloads = 5, expiresInHours = 72 } = {}) {
  const id = uuidv4();
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

  const stmt = db.prepare(`
    INSERT INTO download_tokens (id, order_id, token, max_downloads, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(id, orderId, token, maxDownloads, expiresAt);

  return { id, orderId, token, downloadCount: 0, maxDownloads, expiresAt };
}

/**
 * Retrieves a download token by its token value.
 */
export function getTokenByValue(tokenValue) {
  const stmt = db.prepare('SELECT * FROM download_tokens WHERE token = ?');
  return stmt.get(tokenValue) || null;
}

/**
 * Atomically increments the download count for a token.
 * Only increments if the token has not exceeded max_downloads.
 * Returns true if the increment was successful, false otherwise.
 */
export function incrementDownloadCount(tokenValue) {
  const stmt = db.prepare(`
    UPDATE download_tokens
    SET download_count = download_count + 1,
        last_downloaded_at = CURRENT_TIMESTAMP
    WHERE token = ?
      AND download_count < max_downloads
  `);

  const result = stmt.run(tokenValue);
  return result.changes > 0;
}

// Export the database instance for testing/cleanup purposes
export { db };
