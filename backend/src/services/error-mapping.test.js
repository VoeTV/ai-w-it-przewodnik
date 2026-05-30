import { describe, it, expect } from 'vitest';
import { getErrorMessage, stripeErrors, blikErrors, revolutErrors, paypalErrors, genericError } from './error-mapping.js';

describe('error-mapping', () => {
  describe('getErrorMessage', () => {
    it('returns correct message for Stripe card_declined', () => {
      const result = getErrorMessage('stripe', 'card_declined');
      expect(result.message).toContain('odrzucona');
      expect(result.canRetry).toBe(true);
      expect(result.showAlternatives).toBe(true);
    });

    it('returns correct message for Stripe expired_card', () => {
      const result = getErrorMessage('stripe', 'expired_card');
      expect(result.message).toContain('wygasła');
      expect(result.canRetry).toBe(false);
      expect(result.showAlternatives).toBe(true);
    });

    it('returns correct message for Stripe insufficient_funds', () => {
      const result = getErrorMessage('stripe', 'insufficient_funds');
      expect(result.message).toContain('Niewystarczające środki');
      expect(result.showAlternatives).toBe(true);
    });

    it('returns correct message for Stripe processing_error', () => {
      const result = getErrorMessage('stripe', 'processing_error');
      expect(result.message).toContain('błąd');
      expect(result.canRetry).toBe(true);
    });

    it('returns correct message for Stripe incorrect_cvc', () => {
      const result = getErrorMessage('stripe', 'incorrect_cvc');
      expect(result.message).toContain('CVC');
      expect(result.canRetry).toBe(true);
    });

    it('returns correct message for Stripe authentication_required', () => {
      const result = getErrorMessage('stripe', 'authentication_required');
      expect(result.message).toContain('autoryzacja');
      expect(result.canRetry).toBe(true);
    });

    it('returns correct message for BLIK code expired', () => {
      const result = getErrorMessage('stripe', 'blik_code_expired');
      expect(result.message).toContain('BLIK wygasł');
      expect(result.message).toContain('nowy kod');
      expect(result.canRetry).toBe(true);
    });

    it('returns correct message for BLIK code rejected', () => {
      const result = getErrorMessage('stripe', 'blik_code_rejected');
      expect(result.message).toContain('BLIK');
      expect(result.message).toContain('odrzucona');
      expect(result.canRetry).toBe(true);
      expect(result.showAlternatives).toBe(true);
    });

    it('returns correct message for BLIK timeout (120s)', () => {
      const result = getErrorMessage('stripe', 'blik_timeout');
      expect(result.message).toContain('120 sekund');
      expect(result.canRetry).toBe(true);
      expect(result.showAlternatives).toBe(true);
    });

    it('returns correct message for Revolut FAILED', () => {
      const result = getErrorMessage('revolut', 'FAILED');
      expect(result.message).toContain('Revolut');
      expect(result.canRetry).toBe(true);
      expect(result.showAlternatives).toBe(true);
    });

    it('returns correct message for Revolut CANCELLED', () => {
      const result = getErrorMessage('revolut', 'CANCELLED');
      expect(result.message).toContain('anulowana');
      expect(result.canRetry).toBe(true);
    });

    it('returns correct message for Revolut authorization_failed', () => {
      const result = getErrorMessage('revolut', 'authorization_failed');
      expect(result.message).toContain('autoryzować');
      expect(result.canRetry).toBe(true);
    });

    it('returns correct message for PayPal INSTRUMENT_DECLINED', () => {
      const result = getErrorMessage('paypal', 'INSTRUMENT_DECLINED');
      expect(result.message).toContain('odrzucony');
      expect(result.showAlternatives).toBe(true);
    });

    it('returns correct message for PayPal PAYER_ACTION_REQUIRED', () => {
      const result = getErrorMessage('paypal', 'PAYER_ACTION_REQUIRED');
      expect(result.message).toContain('PayPal');
      expect(result.canRetry).toBe(true);
    });

    it('returns correct message for PayPal ORDER_NOT_APPROVED', () => {
      const result = getErrorMessage('paypal', 'ORDER_NOT_APPROVED');
      expect(result.message).toContain('zatwierdzone');
      expect(result.canRetry).toBe(true);
      expect(result.showAlternatives).toBe(true);
    });

    it('returns generic error for unknown provider', () => {
      const result = getErrorMessage('unknown_provider', 'some_code');
      expect(result.message).toBe(genericError.message);
      expect(result.canRetry).toBe(true);
      expect(result.showAlternatives).toBe(true);
    });

    it('returns generic error for unknown error code', () => {
      const result = getErrorMessage('stripe', 'unknown_error_code');
      expect(result.message).toBe(genericError.message);
      expect(result.canRetry).toBe(true);
      expect(result.showAlternatives).toBe(true);
    });

    it('all messages are in Polish (contain Polish characters or Polish words)', () => {
      const allErrors = [
        ...Object.values(stripeErrors),
        ...Object.values(blikErrors),
        ...Object.values(revolutErrors),
        ...Object.values(paypalErrors),
      ];

      for (const error of allErrors) {
        expect(error.message.length).toBeGreaterThan(0);
        // Polish messages should contain common Polish words
        const polishIndicators = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]|płatność|spróbuj|wybierz|ponownie|metodę/i;
        expect(error.message).toMatch(polishIndicators);
      }
    });

    it('all error entries have required shape', () => {
      const allErrors = [
        ...Object.values(stripeErrors),
        ...Object.values(blikErrors),
        ...Object.values(revolutErrors),
        ...Object.values(paypalErrors),
      ];

      for (const error of allErrors) {
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('canRetry');
        expect(error).toHaveProperty('showAlternatives');
        expect(typeof error.message).toBe('string');
        expect(typeof error.canRetry).toBe('boolean');
        expect(typeof error.showAlternatives).toBe('boolean');
      }
    });

    it('returns a new object (not a reference to internal state)', () => {
      const result1 = getErrorMessage('stripe', 'card_declined');
      const result2 = getErrorMessage('stripe', 'card_declined');
      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });
});
