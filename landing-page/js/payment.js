/**
 * Payment integration module for AI w IT ebook landing page.
 * Supports: Stripe (BLIK + cards), Revolut Pay, PayPal.
 * Requirements: 4.1, 4.2, 4.3, 4.10, 6.5
 */

(function () {
  'use strict';

  // Configurable API base URL
  const API_BASE = window.location.origin + '/api';

  // ─── HTTPS Security Check (Requirement 6.5) ───────────────────────────────

  /**
   * Checks if the connection is secure (HTTPS or localhost for dev).
   * Returns true if secure, false otherwise.
   */
  function isSecureConnection() {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    if (protocol === 'https:') return true;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    return false;
  }

  /**
   * Prevents payment initiation if HTTPS is not available.
   * Displays a Polish error message to the user.
   * Returns true if blocked, false if connection is secure.
   */
  function blockIfInsecure() {
    if (!isSecureConnection()) {
      showError('Połączenie nie jest bezpieczne. Płatności wymagają szyfrowanego połączenia HTTPS. Sprawdź adres strony i spróbuj ponownie.');
      return true;
    }
    return false;
  }

  // ─── UI Helpers ────────────────────────────────────────────────────────────

  /**
   * Creates and shows the payment method selection modal.
   */
  function showPaymentModal() {
    // Remove existing modal if present
    removeModal();

    var overlay = document.createElement('div');
    overlay.id = 'payment-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Wybór metody płatności');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000;';

    var modal = document.createElement('div');
    modal.id = 'payment-modal';
    modal.style.cssText = 'background:#fff;border-radius:12px;padding:32px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.2);position:relative;';

    modal.innerHTML =
      '<button id="payment-modal-close" aria-label="Zamknij" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:24px;cursor:pointer;color:#333;">&times;</button>' +
      '<h2 style="margin:0 0 8px;font-size:1.3rem;color:#1a1a2e;">Wybierz metodę płatności</h2>' +
      '<p style="margin:0 0 24px;color:#555;font-size:0.95rem;">Kwota: <strong>89,99 PLN</strong></p>' +
      '<div id="payment-methods" style="display:flex;flex-direction:column;gap:12px;">' +
        '<button class="payment-method-btn" data-method="stripe" style="padding:14px 20px;border:2px solid #635bff;border-radius:8px;background:#fff;cursor:pointer;font-size:1rem;font-weight:600;color:#635bff;transition:all 0.2s;">BLIK / Karta płatnicza</button>' +
        '<button class="payment-method-btn" data-method="revolut" style="padding:14px 20px;border:2px solid #0075eb;border-radius:8px;background:#fff;cursor:pointer;font-size:1rem;font-weight:600;color:#0075eb;transition:all 0.2s;">Revolut Pay</button>' +
        '<button class="payment-method-btn" data-method="paypal" style="padding:14px 20px;border:2px solid #003087;border-radius:8px;background:#fff;cursor:pointer;font-size:1rem;font-weight:600;color:#003087;transition:all 0.2s;">PayPal</button>' +
      '</div>' +
      '<div id="paypal-button-container" style="margin-top:16px;display:none;"></div>' +
      '<div id="revolut-pay-container" style="margin-top:16px;display:none;"></div>' +
      '<p id="payment-modal-error" style="margin:16px 0 0;color:#d32f2f;font-size:0.9rem;display:none;" role="alert"></p>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close modal on overlay click
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) removeModal();
    });

    // Close button
    document.getElementById('payment-modal-close').addEventListener('click', removeModal);

    // Close on Escape key
    document.addEventListener('keydown', handleEscapeKey);

    // Payment method buttons
    var buttons = modal.querySelectorAll('.payment-method-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', handlePaymentMethodClick);
    }
  }

  function handleEscapeKey(e) {
    if (e.key === 'Escape') removeModal();
  }

  function removeModal() {
    var overlay = document.getElementById('payment-modal-overlay');
    if (overlay) {
      overlay.remove();
    }
    document.removeEventListener('keydown', handleEscapeKey);
    removeBlikIndicator();
  }

  function handlePaymentMethodClick(e) {
    var method = e.currentTarget.getAttribute('data-method');
    clearModalError();

    if (method === 'stripe') {
      initiateStripeCheckout();
    } else if (method === 'revolut') {
      initiateRevolutPay();
    } else if (method === 'paypal') {
      initializePayPal();
    }
  }

  /**
   * Shows an error message in the payment modal or as a standalone overlay.
   */
  function showError(message) {
    var modalError = document.getElementById('payment-modal-error');
    if (modalError) {
      modalError.textContent = message;
      modalError.style.display = 'block';
    } else {
      // Standalone error overlay (e.g., for HTTPS check before modal opens)
      showStandaloneError(message);
    }
  }

  function clearModalError() {
    var modalError = document.getElementById('payment-modal-error');
    if (modalError) {
      modalError.style.display = 'none';
      modalError.textContent = '';
    }
  }

  function showStandaloneError(message) {
    var existing = document.getElementById('payment-error-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'payment-error-overlay';
    overlay.setAttribute('role', 'alert');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10001;';

    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:12px;padding:32px;max-width:400px;width:90%;text-align:center;';
    box.innerHTML =
      '<p style="color:#d32f2f;font-size:1rem;margin:0 0 20px;">' + escapeHtml(message) + '</p>' +
      '<button id="error-close-btn" style="padding:10px 24px;border:none;border-radius:6px;background:#1a1a2e;color:#fff;cursor:pointer;font-size:0.95rem;">Zamknij</button>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById('error-close-btn').addEventListener('click', function () {
      overlay.remove();
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Disables/enables payment method buttons during processing.
   */
  function setButtonsLoading(loading) {
    var buttons = document.querySelectorAll('.payment-method-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = loading;
      buttons[i].style.opacity = loading ? '0.6' : '1';
      buttons[i].style.cursor = loading ? 'not-allowed' : 'pointer';
    }
  }

  // ─── BLIK Waiting Indicator (Requirement 4.10) ─────────────────────────────

  var blikTimerId = null;

  /**
   * Shows the BLIK waiting indicator with a 120-second countdown.
   * Displays a Polish message about confirming payment in the banking app.
   */
  function showBlikIndicator() {
    removeBlikIndicator();

    var remainingSeconds = 120;

    var overlay = document.createElement('div');
    overlay.id = 'blik-indicator-overlay';
    overlay.setAttribute('role', 'alert');
    overlay.setAttribute('aria-live', 'polite');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10002;';

    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:12px;padding:40px;max-width:400px;width:90%;text-align:center;';
    box.innerHTML =
      '<div style="margin-bottom:20px;">' +
        '<div class="blik-spinner" style="width:48px;height:48px;border:4px solid #e0e0e0;border-top:4px solid #635bff;border-radius:50%;animation:blik-spin 1s linear infinite;margin:0 auto;"></div>' +
      '</div>' +
      '<p style="font-size:1.1rem;font-weight:600;color:#1a1a2e;margin:0 0 8px;">Potwierdź płatność BLIK w aplikacji bankowej</p>' +
      '<p style="font-size:0.9rem;color:#555;margin:0 0 16px;">Otwórz aplikację bankową na telefonie i zatwierdź transakcję.</p>' +
      '<p id="blik-countdown" style="font-size:1.5rem;font-weight:700;color:#635bff;margin:0;">2:00</p>' +
      '<style>@keyframes blik-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    var countdownEl = document.getElementById('blik-countdown');

    blikTimerId = setInterval(function () {
      remainingSeconds--;
      if (remainingSeconds <= 0) {
        clearInterval(blikTimerId);
        blikTimerId = null;
        removeBlikIndicator();
        showError('Czas na potwierdzenie BLIK upłynął. Spróbuj ponownie.');
        return;
      }
      var minutes = Math.floor(remainingSeconds / 60);
      var seconds = remainingSeconds % 60;
      if (countdownEl) {
        countdownEl.textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
      }
    }, 1000);
  }

  /**
   * Removes the BLIK waiting indicator and clears the timer.
   */
  function removeBlikIndicator() {
    if (blikTimerId) {
      clearInterval(blikTimerId);
      blikTimerId = null;
    }
    var overlay = document.getElementById('blik-indicator-overlay');
    if (overlay) overlay.remove();
  }

  // ─── Stripe Checkout (Requirement 4.1, 4.8) ───────────────────────────────

  /**
   * Initiates Stripe Checkout session.
   * Calls POST /api/create-checkout-session, then redirects to Stripe hosted checkout.
   */
  function initiateStripeCheckout() {
    if (blockIfInsecure()) return;

    setButtonsLoading(true);
    showBlikIndicator();

    fetch(API_BASE + '/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function (result) {
        removeBlikIndicator();
        setButtonsLoading(false);

        if (!result.ok) {
          showError(result.data.error || 'Wystąpił błąd podczas tworzenia sesji płatności. Spróbuj ponownie.');
          return;
        }

        if (result.data.url) {
          window.location.href = result.data.url;
        } else {
          showError('Nie udało się uzyskać adresu płatności. Spróbuj ponownie.');
        }
      })
      .catch(function () {
        removeBlikIndicator();
        setButtonsLoading(false);
        showError('Wystąpił problem z połączeniem. Sprawdź internet i spróbuj ponownie.');
      });
  }

  // ─── Revolut Pay (Requirement 4.2) ────────────────────────────────────────

  /**
   * Initiates Revolut Pay payment.
   * Calls POST /api/create-revolut-order, then initializes the Revolut Pay SDK widget.
   */
  function initiateRevolutPay() {
    if (blockIfInsecure()) return;

    setButtonsLoading(true);

    fetch(API_BASE + '/create-revolut-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function (result) {
        setButtonsLoading(false);

        if (!result.ok) {
          showError(result.data.error || 'Nie udało się utworzyć zamówienia Revolut. Spróbuj ponownie.');
          return;
        }

        initRevolutWidget(result.data.token, result.data.orderId);
      })
      .catch(function () {
        setButtonsLoading(false);
        showError('Wystąpił problem z połączeniem. Sprawdź internet i spróbuj ponownie.');
      });
  }

  /**
   * Initializes the Revolut Pay SDK widget with the order token.
   */
  function initRevolutWidget(token, orderId) {
    var container = document.getElementById('revolut-pay-container');
    if (!container) return;

    container.style.display = 'block';
    container.innerHTML = '<p style="color:#555;font-size:0.9rem;text-align:center;">Ładowanie Revolut Pay...</p>';

    // Check if RevolutCheckout SDK is loaded
    if (typeof window.RevolutCheckout === 'undefined') {
      container.innerHTML = '';
      showError('Nie udało się załadować Revolut Pay. Odśwież stronę lub wybierz inną metodę płatności.');
      return;
    }

    window.RevolutCheckout(token).then(function (instance) {
      container.innerHTML = '';
      instance.payWithPopup({
        onSuccess: function () {
          removeModal();
          window.location.href = 'success.html?provider=revolut&order=' + encodeURIComponent(orderId);
        },
        onError: function (error) {
          var message = (error && error.message) || 'Nie udało się autoryzować płatności Revolut. Spróbuj ponownie.';
          showError(message);
        },
        onCancel: function () {
          container.style.display = 'none';
          container.innerHTML = '';
        },
      });
    }).catch(function () {
      container.innerHTML = '';
      showError('Nie udało się zainicjować Revolut Pay. Spróbuj ponownie lub wybierz inną metodę.');
    });
  }

  // ─── PayPal (Requirement 4.3) ─────────────────────────────────────────────

  /**
   * Initializes the PayPal button and handles the approve/cancel/error flow.
   */
  function initializePayPal() {
    if (blockIfInsecure()) return;

    var container = document.getElementById('paypal-button-container');
    if (!container) return;

    // Check if PayPal SDK is loaded
    if (typeof window.paypal === 'undefined') {
      showError('Nie udało się załadować PayPal. Odśwież stronę lub wybierz inną metodę płatności.');
      return;
    }

    // Show container and clear previous buttons
    container.style.display = 'block';
    container.innerHTML = '';

    window.paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'pay',
      },

      // Create order on the server
      createOrder: function () {
        return fetch(API_BASE + '/create-paypal-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
          .then(function (response) {
            return response.json().then(function (data) {
              return { ok: response.ok, data: data };
            });
          })
          .then(function (result) {
            if (!result.ok) {
              throw new Error(result.data.error || 'Nie udało się utworzyć zamówienia PayPal.');
            }
            return result.data.orderId;
          });
      },

      // Capture order after buyer approval
      onApprove: function (data) {
        return fetch(API_BASE + '/capture-paypal-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderID }),
        })
          .then(function (response) {
            return response.json().then(function (responseData) {
              return { ok: response.ok, data: responseData };
            });
          })
          .then(function (result) {
            if (!result.ok) {
              showError(result.data.error || 'Nie udało się potwierdzić płatności PayPal. Spróbuj ponownie.');
              return;
            }
            removeModal();
            window.location.href = 'success.html?provider=paypal&order=' + encodeURIComponent(result.data.orderId);
          });
      },

      // Handle cancellation
      onCancel: function () {
        showError('Płatność PayPal została anulowana. Możesz spróbować ponownie.');
      },

      // Handle errors
      onError: function (err) {
        var message = (err && err.message) || 'Wystąpił błąd podczas płatności PayPal. Spróbuj ponownie lub wybierz inną metodę.';
        showError(message);
      },
    }).render(container);
  }

  // ─── Initialization ───────────────────────────────────────────────────────

  function init() {
    var ctaButton = document.getElementById('cta-button');
    if (ctaButton) {
      ctaButton.addEventListener('click', function (e) {
        e.preventDefault();
        if (blockIfInsecure()) return;
        showPaymentModal();
      });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
