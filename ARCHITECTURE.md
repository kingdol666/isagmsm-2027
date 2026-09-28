# ARCHITECTURE

Nuxt 4 is the unified frontend and backend (Nitro server). No other backend framework.

```
app/                      frontend (Vue 3, SSR)
  ├── layouts/            site (rail+footer) · flow (register/pay/credential) · admin · bare (/scan)
  ├── pages/              index · register · payment/[id] · pay/mock/[id] · credential/[token] ·
  │                       verify/[token] · scan · admin/* (login, dashboard, 5 lists)
  ├── components/         site/ (Swiss-grid sections) · flow/ (steps) · admin/ (tables)
  └── assets/css/         design tokens + shared styles (Direction C)
shared/                   types/ · schemas/ (zod, used by client AND server) · content/ (site copy)
server/
  ├── api/                REST endpoints (see below)
  ├── middleware/         admin-api.ts — session guard for /api/admin/** and /api/checkin/**
  ├── services/           business logic: pricing, registration, order, payment, credential, checkin
  ├── repositories/       all SQL lives here (Drizzle, parameterised)
  ├── db/                 schema.ts · migrations/ · seed/ · counters
  ├── payments/           PaymentProvider interface + mock / wechat / alipay adapters
  └── utils/              db · session · validation (zod) · rate-limit
tests/                    unit/ (Vitest) · e2e/ (Playwright)
```

## Domain model

```
User → Registration → Order → Payment → Credential → Check-in
```

Five separate entities (never merged), mirroring the conference workflow. Money is stored as integer fen. Human-friendly ids (`ISAGMSM-000123`, `ISAGMSM-ORD-000123`) come from an atomic counter table (no raw SQL).

The abstract-review chain runs in parallel: `User → Abstract → AbstractEvent` (状态机 `submitted → accepted | returned`，`returned` 可修改重投并版本 +1；`abstract_events` 是投稿人可见的历史记录，审稿结果邮件通知注册邮箱)。

Key invariants:

- Prices are computed server-side only (`RegistrationPricingService`: type price − early-bird discount).
- Order/payment state transitions are guarded (`UPDATE … WHERE status = 'previous'`), so concurrent webhooks cannot double-apply.
- `payment_events` has a unique index on `(provider, event_id)` — webhook idempotency at the storage layer.
- A PAID callback runs `payment→paid, order→paid, registration→confirmed, credential issued` in ONE transaction.
- Credential tokens are 256-bit random (base64url) — QR content is never a guessable id.
- `checkins.credential_id` is unique — duplicate check-ins are impossible at the storage layer.

## API surface

```
POST /api/auth/send-code              6-digit email code (signup | reset; dev mode returns devCode)
POST /api/auth/register               sign-up (email + code + password + name) → session
POST /api/auth/login                  email + password → session
POST /api/auth/logout                 clear participant session
GET  /api/auth/me                     current account (or null)
POST /api/auth/forgot-password        send reset code (never reveals account existence)
POST /api/auth/reset-password         code + new password (signs out)
GET/PUT /api/account/profile          participant profile (pre-fills registrations)
GET  /api/account/registrations       my registrations + order/payment status + credential links
GET  /api/registration-types          public type list (server-owned prices)
POST /api/registrations               register for the conference (REQUIRES signed-in account)
GET  /api/registrations/:id           registration detail
POST /api/orders                      create order for a registration
GET  /api/orders/:id                  order status (+ credential token once paid)
POST /api/payments/create             start a provider payment
GET  /api/payments/providers          which providers are configured
GET  /api/payments/:id                payment status
GET  /api/payments/:id/qr             payment QR (SVG)
POST /api/payments/webhook/mock       HMAC-verified webhook (mock cashier also uses this path)
POST /api/payments/webhook/wechat     WeChat Pay v3 webhook (RSA + AES-GCM)
POST /api/payments/webhook/alipay     Alipay async notify (RSA2)
GET  /api/credentials/:token          public credential lookup
GET  /api/credentials/:token/qr       credential QR (SVG, encodes verify URL)
GET  /api/credentials/:token/pdf      printable PDF (pdf-lib, server-generated)
POST /api/checkin/verify              staff: read-only token verification
POST /api/checkin                     staff: confirm check-in (duplicate-safe)
POST /api/abstracts                   submit an abstract (REQUIRES signed-in account; authors w/ affiliations)
GET  /api/abstracts/mine              my abstracts + full review history
POST /api/abstracts/:id/resubmit      revise & resubmit a RETURNED abstract (version + 1)
GET  /api/admin/abstracts             admin: all abstracts (+ submitter email)
GET  /api/admin/abstracts/:id/events  admin: one abstract's review history
POST /api/admin/abstracts/:id/review  admin: accept | return (comment → emailed to the submitter)
POST /api/admin/login|logout, GET /api/admin/me
GET  /api/admin/dashboard|registrations|orders|payments|credentials|checkins
```

## Accounts & sessions

Two independent, stateless session kinds (HMAC-signed httpOnly cookies, 12 h):

- `pps_admin` — organisers (`admin` / `staff` roles) for `/api/admin/**` + `/api/checkin/**`.
- `pps_user` — participant accounts for `/api/account/**`; conference registration (`POST /api/registrations`) requires it and locks the registration email to the account.

Email verification codes (`email_verifications`): 6 digits, SHA-256-hashed at rest, 10-minute expiry, max 5 wrong attempts (then burned), 60-second resend cooldown, one active code per (email, purpose). Delivery via `MailService`: dev transport logs + returns the code (`devCode`) so the flow is testable without SMTP; the SMTP transport activates with `MAIL_SMTP_*` env. Passwords: scrypt with per-user salt. Password reset never reveals whether an email exists.

## Rendering & performance

- `/` uses SWR route rules (`swr: 60`); dynamic flow pages render per request.
- Fonts are self-hosted via @fontsource (no Google CDN at runtime — China-safe).
- Speaker "photos" are typographic monogram plates with fixed aspect-ratio (zero CLS); the venue map is an inline SVG placeholder labelled "to be embedded" (honest placeholder, no fake map).
- Animations limited to hover, tabs, scroll-spy; `prefers-reduced-motion` respected.

## Security

- Server-side re-validation of every mutation (zod schemas in `shared/schemas/`).
- Admin sessions: HMAC-signed token in an httpOnly/SameSite=Lax cookie (12 h TTL), server middleware guards `/api/admin/**` and `/api/checkin/**`; role separation (`admin` vs `staff`).
- Payment webhooks: signature-verified, idempotent, amount-tamper-checked, rate-limited (see PAYMENT.md).
- Secrets only in env (`.env` never committed; `.env.example` documents all variables).
- Alipay gateway is host-allow-listed; no user-supplied URLs are ever fetched server-side.
