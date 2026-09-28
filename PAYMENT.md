# PAYMENT.md — Payment Architecture

## Overview

Payments follow the **adapter pattern**, isolated under `server/payments/`. Business code only ever talks to the `PaymentProvider` interface (`server/payments/types.ts`) and the `PaymentService` (`server/services/payment.service.ts`).

```
PaymentService
├── MockPaymentProvider   (always available — dev/demo, full webhook path)
├── WeChatPayProvider     (activates when WECHAT_* env is complete)
└── AlipayProvider        (activates when ALIPAY_* env is complete)
```

## Guarantees (all providers)

1. **Server-side pricing** — order totals are computed by `computePrice()` (`server/services/pricing.service.ts`) from the `registration_types` table. Client-provided amounts are never read.
2. **Signature verification** — every webhook is verified against the provider's signature scheme before parsing:
   - Mock: HMAC-SHA256 over the raw body (`X-Mock-Signature`), `timingSafeEqual`.
   - WeChat Pay v3: RSA-SHA256 over `timestamp\nnonce\nbody\n` against platform certificates, then AES-256-GCM resource decryption with the APIv3 key.
   - Alipay: RSA2 over the sorted `key=value` pairs against the Alipay public key.
3. **Idempotency** — `payment_events` has a unique index on `(provider, event_id)`. The first insert "wins" and is processed; duplicates are recorded with `accepted = false` and skipped. Concurrent PAID callbacks are additionally guarded by transaction-safe transitions (`UPDATE … WHERE status = 'pending'`).
4. **Amount tamper check** — a callback amount that differs from the stored order total fails the payment and is rejected.
5. **Atomic PAID transaction** — `payment → paid`, `order → paid`, `registration → confirmed`, `credential issued` happen in ONE database transaction.
6. **Rate limiting** — payment creation and webhook endpoints are rate-limited per IP (`server/utils/rate-limit.ts`).

## Mock payment (default)

- `POST /api/payments/create {orderId, provider: 'mock'}` → payment with `cashierUrl` + `qrContent`.
- The payment page renders the QR (`/api/payments/:id/qr` = SVG) and polls order status every 2.5 s.
- `/pay/mock/:paymentId` is the simulated cashier (what a phone would open after scanning). Its buttons fire a **signed webhook** through the exact same verification + idempotency path as a real provider callback.
- Webhook endpoint: `POST /api/payments/webhook/mock` (HMAC header `x-mock-signature`).

## WeChat Pay v3 (Native / PC QR)

Adapter: `server/payments/wechat.ts`. Activates only when **all** of these are set:

```
WECHAT_MCH_ID, WECHAT_APP_ID, WECHAT_PRIVATE_KEY, WECHAT_CERT_SERIAL,
WECHAT_API_V3_KEY, WECHAT_PLATFORM_CERTS, WECHAT_NOTIFY_URL
```

- `WECHAT_PRIVATE_KEY` — merchant private key PEM (API certificate key); `\n`-escaped single line accepted.
- `WECHAT_PLATFORM_CERTS` — one or more platform certificate/public-key PEMs, separated by the literal marker `---SPLIT---`; used to verify webhook signatures.
- `WECHAT_NOTIFY_URL` — public https URL of `POST /api/payments/webhook/wechat`.
- Requests are signed `WECHATPAY2-SHA256-With-RSA-Pattern`; the gateway host is fixed to `https://api.mch.weixin.qq.com`.
- Webhook resources are decrypted with AES-256-GCM (`APIv3 key`), `trade_state` mapped to our statuses (`SUCCESS → paid`, `CLOSED/PAYERROR/REVOKED → failed`, else `pending`).

## Alipay (RSA2)

Adapter: `server/payments/alipay.ts`. Activates only when **all** of these are set:

```
ALIPAY_APP_ID, ALIPAY_PRIVATE_KEY, ALIPAY_PUBLIC_KEY, ALIPAY_NOTIFY_URL
```

- Uses `alipay.trade.precreate` (QR code) and the async notify (`POST /api/payments/webhook/alipay`).
- Notify signatures are verified with `ALIPAY_PUBLIC_KEY`; `TRADE_SUCCESS`/`TRADE_FINISHED → paid`, `TRADE_CLOSED → failed`.
- Responds plain `success` / `fail` per Alipay convention.
- The gateway is allow-listed to official hosts only (`openapi.alipay.com`, sandbox) — SSRF-safe.

## Provider selection

- `GET /api/payments/providers` lists what is configured right now (mock always).
- The payment page auto-starts the pending **mock** payment for the demo flow; once real providers are configured, staff/participants pick WeChat/Alipay from the same page (mock remains for rehearsal).
- Requesting an unconfigured provider returns a loud 400/409 — never a silent fallback.

## Production checklist (before flipping real payments on)

- [ ] Merchant credentials in the deployment secret store (never in git).
- [ ] `WECHAT_NOTIFY_URL` / `ALIPAY_NOTIFY_URL` are public **https** endpoints.
- [ ] Platform certificates refreshed (WeChat rotates them; monitor serials).
- [ ] Webhook endpoints reachable from provider networks (firewall, WAF).
- [ ] End-to-end tested in the provider sandbox with a real order → paid → credential.
- [ ] Reconciliation job scheduled: for each `pending` payment older than N minutes, call `queryPayment` and reconcile (active queries exist on both adapters).
- [ ] `NUXT_SESSION_SECRET` and `NUXT_MOCK_PAYMENT_SECRET` rotated from dev defaults.
- [ ] Admin/staff passwords changed (`ADMIN_PASSWORD`, `STAFF_PASSWORD`).
