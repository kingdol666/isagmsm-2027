# ARCHITECTURE

双应用拓扑（pnpm workspace）：**门户**（`.`，3000）+ **独立管理台**（`admin/`，3001）。
两个 Nuxt 4 应用各自独立构建/部署/会话，唯一共享点是同一个 PostgreSQL 数据库（迁移由门户拥有）。

```
门户（3000）                                管理台（3001，admin/）
  公开网站 / 注册 / 报名 / 缴费页              登录（仅 admin 角色）
  在线投稿 / 我的投稿                          参会管理（会员开关 + 凭证操作）
  凭证 / verify / 电子卡                      缴费审批（通过/驳回）
  /scan 扫码端（staff cookie: pps_staff）      稿件审稿（接收/返稿 + 邮件）
  cookie: pps_user                            cookie: pps_console
  secret: NUXT_SESSION_SECRET                 secret: NUXT_CONSOLE_SESSION_SECRET
        └──────────── 共享 PostgreSQL（唯一数据通道）────────────┘
```

隔离性质：cookie 按 host 共享、按名字区分 —— 三个会话（`pps_user` / `pps_staff` /
`pps_console`）互不可用；门户没有任何管理页面或 `/api/admin/**`（管理面整体迁至 `admin/`）；
管理台登录仅接受 `admin` 角色（staff 只能扫码）。

## 会员-凭证绑定（跨两应用的领域不变量）

1. `ensureCredential`（门户）与凭证下发（管理台）都要求 `registrations.is_member = true`
   —— 非会员支付成功也不发证；
2. 管理台「取消会员」在同一事务内摘除会员标识并 `credentials.status → revoked`
   （旧 QR/token 立即失效）；
3. 入会/取消仅限管理台 admin。

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
  ├── services/           business logic: pricing, registration, order, payment, credential, checkin, abstract, storage (S3-compatible OSS)
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

The abstract-review chain runs in parallel: `User → Abstract → AbstractEvent` (状态机 `submitted → accepted | returned`，`returned` 可修改重投并版本 +1；`abstract_events` 是投稿人可见的历史记录，审稿结果邮件通知注册邮箱；每次投稿/重投的 Word/PDF 附件（≤10MB）经魔数校验后存入 S3 兼容对象存储（docker compose `oss` 服务，宿主端口 9100，S3 凭证经 OSS_* 环境变量配置），DB 仅存对象键与元数据)。

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
POST /api/staff/login|logout, GET /api/staff/me   scanner staff sessions (staff OR admin; cookie pps_staff)
POST /api/abstracts                   submit an abstract + attachment (multipart; Word/PDF ≤10MB required; authors w/ affiliations)
GET  /api/abstracts/mine              my abstracts + full review history
POST /api/abstracts/:id/resubmit      revise & resubmit a RETURNED abstract + new attachment (version + 1)
GET  /api/abstracts/:id/files/:version download own per-version attachment (owner only)

── 以下管理 API 属于独立管理台（admin/，端口 3001，cookie pps_console，仅 admin）──
POST /api/login|logout, GET /api/me
GET  /api/dashboard                   live counts + revenue
GET  /api/participants                all registrations (+ type/order/credential/checkin)
POST /api/participants/:id/membership 会员开关（取消 = 事务内自动吊销全部 active 凭证）
POST /api/orders/:id/approve|reject   收款确认（会员自动发证）/ 驳回
POST /api/credentials/manage          issue（仅会员）| revoke | restore
GET  /api/abstracts                   all abstracts (+ submitter email)
GET  /api/abstracts/:id/events        review history
POST /api/abstracts/:id/review        accept | return（comment 邮件通知投稿人）
GET  /api/abstracts/:id/files/:version download per-version attachment (console session required)
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
