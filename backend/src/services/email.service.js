import nodemailer from 'nodemailer';
import config from '../config/index.js';

/**
 * Creates a nodemailer SMTP transporter using config settings.
 * @returns {import('nodemailer').Transporter}
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
}

/**
 * Sends a purchase confirmation email with download link and transaction details.
 * Email content is in Polish language.
 *
 * @param {object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.downloadUrl - Unique download link for the ebook
 * @param {string} params.transactionId - Payment transaction ID
 * @param {string} params.amount - Formatted amount paid (e.g. "89,99 PLN")
 * @param {string} params.paymentMethod - Payment method used (e.g. "BLIK", "PayPal", "Revolut")
 * @returns {Promise<void>}
 * @throws {Error} If email sending fails
 */
export async function sendPurchaseConfirmation({ to, downloadUrl, transactionId, amount, paymentMethod }) {
  const transporter = createTransporter();

  const subject = 'Potwierdzenie zakupu — AI w IT: Praktyczny Przewodnik';

  const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f7; color: #333333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1a73e8; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">Dziękujemy za zakup!</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6;">
                Twoja płatność została pomyślnie zrealizowana. Poniżej znajdziesz szczegóły transakcji oraz link do pobrania e-booka.
              </p>

              <!-- Transaction details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 16px; font-size: 16px; color: #555555;">Szczegóły transakcji</h2>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #666666;">ID transakcji:</td>
                        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; text-align: right;">${transactionId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #666666;">Kwota:</td>
                        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; text-align: right;">${amount}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #666666;">Metoda płatności:</td>
                        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; text-align: right;">${paymentMethod}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Download button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${downloadUrl}" style="display: inline-block; background-color: #1a73e8; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Pobierz e-book
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Download info -->
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #664d03;">
                  <strong>Ważne informacje o pobieraniu:</strong><br />
                  • Link jest ważny przez <strong>72 godziny</strong> od momentu zakupu.<br />
                  • Możesz pobrać plik maksymalnie <strong>5 razy</strong>.<br />
                  • Po wygaśnięciu linku skontaktuj się z nami, aby otrzymać nowy.
                </p>
              </div>

              <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.6; color: #666666;">
                Jeśli przycisk nie działa, skopiuj i wklej poniższy link do przeglądarki:
              </p>
              <p style="margin: 8px 0 0; font-size: 13px; word-break: break-all; color: #1a73e8;">
                ${downloadUrl}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 24px 40px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #888888; text-align: center;">
                Masz pytania? Skontaktuj się z nami: <a href="mailto:kontakt@ai-w-it.pl" style="color: #1a73e8; text-decoration: none;">kontakt@ai-w-it.pl</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #aaaaaa; text-align: center;">
                AI w IT: Praktyczny Przewodnik dla Początkujących
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from: `"AI w IT" <${config.smtp.user}>`,
    to,
    subject,
    html,
  });
}
