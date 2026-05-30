import fs from 'fs';
import { createDownloadToken, getTokenByValue, incrementDownloadCount } from '../models/database.js';
import config from '../config/index.js';

/**
 * Generates a unique download token for a completed order.
 * Token expires after 72 hours and allows a maximum of 5 downloads.
 *
 * @param {string} orderId - The order ID to associate with the token
 * @param {string} email - The customer's email address
 * @returns {{ token: string, downloadUrl: string, expiresAt: string, maxAttempts: number }}
 */
export function generateDownloadToken(orderId, email) {
  const tokenRecord = createDownloadToken(orderId, { maxDownloads: 5, expiresInHours: 72 });

  return {
    token: tokenRecord.token,
    downloadUrl: `${config.baseUrl}/api/download/${tokenRecord.token}`,
    expiresAt: tokenRecord.expiresAt,
    maxAttempts: 5,
  };
}

/**
 * Validates a download token and serves the file if all checks pass.
 * Does NOT increment the download count on server errors (file not found, I/O error).
 *
 * @param {string} tokenValue - The token string from the download URL
 * @returns {{ valid: boolean, filePath?: string, error?: string, remainingAttempts?: number }}
 */
export function validateAndServe(tokenValue) {
  const token = getTokenByValue(tokenValue);

  if (!token) {
    return { valid: false, error: 'not_found' };
  }

  const now = new Date();
  const expiresAt = new Date(token.expires_at);

  if (now > expiresAt) {
    return { valid: false, error: 'expired' };
  }

  if (token.download_count >= token.max_downloads) {
    return { valid: false, error: 'max_attempts' };
  }

  // Check if PDF file exists on disk BEFORE incrementing count
  if (!fs.existsSync(config.pdfPath)) {
    return { valid: false, error: 'server_error' };
  }

  // All checks passed — increment count atomically
  const incremented = incrementDownloadCount(tokenValue);

  if (!incremented) {
    // Race condition: another request consumed the last attempt
    return { valid: false, error: 'max_attempts' };
  }

  const remainingAttempts = token.max_downloads - token.download_count - 1;

  return {
    valid: true,
    filePath: config.pdfPath,
    remainingAttempts,
  };
}
