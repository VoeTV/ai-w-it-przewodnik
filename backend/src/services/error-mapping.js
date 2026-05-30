/**
 * Payment error mapping module.
 * Maps error codes from all supported payment providers (Stripe, Revolut, PayPal)
 * to Polish-language user-facing messages with retry/alternative payment options.
 */

const stripeErrors = {
  card_declined: {
    message: 'Płatność kartą została odrzucona. Sprawdź dane karty lub wybierz inną metodę płatności.',
    canRetry: true,
    showAlternatives: true,
  },
  expired_card: {
    message: 'Karta płatnicza wygasła. Użyj innej karty lub wybierz alternatywną metodę płatności.',
    canRetry: false,
    showAlternatives: true,
  },
  insufficient_funds: {
    message: 'Niewystarczające środki na karcie. Wybierz inną metodę płatności.',
    canRetry: false,
    showAlternatives: true,
  },
  processing_error: {
    message: 'Wystąpił błąd podczas przetwarzania płatności. Spróbuj ponownie za chwilę.',
    canRetry: true,
    showAlternatives: true,
  },
  incorrect_cvc: {
    message: 'Nieprawidłowy kod CVC. Sprawdź dane karty i spróbuj ponownie.',
    canRetry: true,
    showAlternatives: false,
  },
  authentication_required: {
    message: 'Wymagana dodatkowa autoryzacja. Potwierdź płatność w aplikacji banku lub spróbuj inną metodą.',
    canRetry: true,
    showAlternatives: true,
  },
  payment_intent_authentication_failure: {
    message: 'Autoryzacja płatności nie powiodła się. Spróbuj ponownie lub wybierz inną metodę płatności.',
    canRetry: true,
    showAlternatives: true,
  },
  rate_limit: {
    message: 'Zbyt wiele prób płatności. Odczekaj chwilę i spróbuj ponownie.',
    canRetry: true,
    showAlternatives: false,
  },
};

const blikErrors = {
  blik_code_expired: {
    message: 'Kod BLIK wygasł. Wygeneruj nowy kod w aplikacji bankowej i spróbuj ponownie.',
    canRetry: true,
    showAlternatives: true,
  },
  blik_code_rejected: {
    message: 'Płatność BLIK została odrzucona przez bank. Spróbuj ponownie lub wybierz inną metodę płatności.',
    canRetry: true,
    showAlternatives: true,
  },
  blik_timeout: {
    message: 'Upłynął czas oczekiwania na potwierdzenie BLIK (120 sekund). Wygeneruj nowy kod i spróbuj ponownie.',
    canRetry: true,
    showAlternatives: true,
  },
};

const revolutErrors = {
  FAILED: {
    message: 'Płatność Revolut nie powiodła się. Spróbuj ponownie lub wybierz inną metodę płatności.',
    canRetry: true,
    showAlternatives: true,
  },
  CANCELLED: {
    message: 'Płatność Revolut została anulowana. Możesz spróbować ponownie lub wybrać inną metodę płatności.',
    canRetry: true,
    showAlternatives: true,
  },
  authorization_failed: {
    message: 'Nie udało się autoryzować płatności Revolut. Sprawdź saldo konta i spróbuj ponownie.',
    canRetry: true,
    showAlternatives: true,
  },
};

const paypalErrors = {
  INSTRUMENT_DECLINED: {
    message: 'Wybrany instrument płatniczy PayPal został odrzucony. Wybierz inną metodę płatności w PayPal lub użyj alternatywnej opcji.',
    canRetry: true,
    showAlternatives: true,
  },
  PAYER_ACTION_REQUIRED: {
    message: 'Wymagane dodatkowe działanie w PayPal. Zaloguj się do PayPal i zatwierdź płatność.',
    canRetry: true,
    showAlternatives: false,
  },
  ORDER_NOT_APPROVED: {
    message: 'Zamówienie PayPal nie zostało zatwierdzone. Spróbuj ponownie lub wybierz inną metodę płatności.',
    canRetry: true,
    showAlternatives: true,
  },
};

const genericError = {
  message: 'Wystąpił nieoczekiwany błąd płatności. Spróbuj ponownie lub wybierz inną metodę płatności.',
  canRetry: true,
  showAlternatives: true,
};

const errorMaps = {
  stripe: { ...stripeErrors, ...blikErrors },
  revolut: revolutErrors,
  paypal: paypalErrors,
};

/**
 * Returns a Polish-language error message with retry/alternative options
 * for a given payment provider and error code.
 *
 * @param {string} provider - Payment provider: 'stripe', 'revolut', or 'paypal'
 * @param {string} errorCode - Provider-specific error code
 * @returns {{ message: string, canRetry: boolean, showAlternatives: boolean }}
 */
export function getErrorMessage(provider, errorCode) {
  const providerMap = errorMaps[provider];

  if (!providerMap) {
    return { ...genericError };
  }

  const errorEntry = providerMap[errorCode];

  if (!errorEntry) {
    return { ...genericError };
  }

  return { ...errorEntry };
}

export { stripeErrors, blikErrors, revolutErrors, paypalErrors, genericError, errorMaps };
