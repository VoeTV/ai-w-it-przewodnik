# AI w IT: Praktyczny Przewodnik dla Początkujących

Projekt obejmuje e-book "AI w IT: Praktyczny Przewodnik dla Początkujących" — praktyczny przewodnik po narzędziach AI dla osób z branży IT/telekomunikacji, wraz z profesjonalną stroną sprzedażową i systemem płatności online.

E-book pomaga w codziennych zadaniach zawodowych, obejmując tematy od automatyzacji helpdesku po inżynierię promptów i bezpieczeństwo IT.

**Cena:** 89,99 PLN

## Struktura katalogów

| Katalog | Opis |
|---------|------|
| `ebook/` | Pliki źródłowe e-booka |
| `ebook/chapters/` | Rozdziały e-booka w formacie Markdown |
| `ebook/assets/images/` | Obrazy i grafiki używane w e-booku |
| `ebook/build/` | Wygenerowany plik PDF e-booka |
| `landing-page/` | Statyczna strona sprzedażowa (HTML/CSS/JS) |
| `landing-page/css/` | Arkusze stylów strony sprzedażowej |
| `landing-page/js/` | Skrypty JavaScript (integracja płatności) |
| `landing-page/images/` | Obrazy strony sprzedażowej (okładka, OG image) |
| `backend/` | Serwer Node.js/Express obsługujący płatności i dostarczanie |
| `backend/src/routes/` | Endpointy API (płatności, webhooki, pobieranie) |
| `backend/src/services/` | Logika biznesowa (Stripe, Revolut, PayPal, e-mail, download) |
| `backend/src/models/` | Modele danych i schemat bazy SQLite |
| `backend/src/config/` | Konfiguracja środowiskowa i zmienne |
| `assets/fonts/` | Czcionki współdzielone między komponentami projektu |

## Wymagania wstępne

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Pandoc** lub **md-to-pdf** — do generowania PDF z plików Markdown
- **Konto Stripe** — do obsługi płatności BLIK i kartami
- **Konto Revolut Business** — do obsługi płatności Revolut Pay
- **Konto PayPal Business** — do obsługi płatności PayPal
- **Serwis e-mail** (Resend lub SendGrid) — do wysyłki potwierdzeń zakupu

## Instalacja i uruchomienie

### 1. Klonowanie / pobranie projektu

```bash
cd d:\Dokumenty\ai-w-it-praktyczny-przewodnik
```

### 2. Instalacja zależności backendu

```bash
cd backend
npm install
```

### 3. Konfiguracja zmiennych środowiskowych

Skopiuj plik `.env.example` do `.env` i uzupełnij wartości:

```bash
cp .env.example .env
```

Wymagane zmienne:
- `STRIPE_SECRET_KEY` — klucz tajny Stripe
- `STRIPE_WEBHOOK_SECRET` — sekret webhooka Stripe
- `REVOLUT_API_KEY` — klucz API Revolut Merchant
- `REVOLUT_WEBHOOK_SECRET` — sekret webhooka Revolut
- `PAYPAL_CLIENT_ID` — identyfikator klienta PayPal
- `PAYPAL_CLIENT_SECRET` — sekret klienta PayPal
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — konfiguracja e-mail
- `BASE_URL` — bazowy URL aplikacji (np. `https://twoja-domena.pl`)
- `PDF_PATH` — ścieżka do pliku PDF e-booka

### 4. Uruchomienie serwera deweloperskiego

```bash
cd backend
npm run dev
```

Serwer uruchomi się domyślnie na porcie `3000`.

### 5. Generowanie PDF e-booka

Do konwersji rozdziałów Markdown na PDF użyj Pandoc:

```bash
pandoc ebook/chapters/*.md -o ebook/build/ai-w-it-przewodnik.pdf --pdf-engine=xelatex -V geometry:margin=15mm -V fontsize=10pt -V papersize=a4
```

Alternatywnie z md-to-pdf:

```bash
npx md-to-pdf ebook/chapters/*.md --output ebook/build/ai-w-it-przewodnik.pdf
```

### 6. Testowanie

```bash
cd backend
npm test
```

## Metody płatności

- **BLIK** — przez Stripe Checkout
- **Karty płatnicze** — przez Stripe Checkout
- **Revolut Pay** — przez Revolut Merchant API
- **PayPal** — przez PayPal JavaScript SDK

## Licencja

Wszelkie prawa zastrzeżone. Treść e-booka i kod źródłowy projektu są własnością autora.
