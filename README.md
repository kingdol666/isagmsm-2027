# PPS 2026 — Polymer Processing Symposium

> Materials · Processing · Manufacturing · Intelligence
> 15—17 October 2026 · Hefei · China

Full-stack conference platform: public symposium website, email registration, orders, payments (mock + WeChat/Alipay adapters), electronic credentials with QR verification, on-site check-in scanner, and an admin dashboard.

Built with **Nuxt 4 · Vue 3 · TypeScript · Nitro · Nuxt UI 4 · Tailwind CSS 4 · Drizzle ORM · PostgreSQL · Vitest · Playwright**.

Visual identity: **Direction C — "The Grid as Instrument"** (Swiss International Style after Josef Müller-Brockmann), selected from three design drafts (`design-demos/`). See `PLAN.md` for the design system.

## Quick start

```bash
pnpm install
docker compose up -d          # PostgreSQL 17 on localhost:5433
pnpm db:migrate               # create schema
pnpm db:seed                  # demo data (speakers, program, participants, admin accounts)
pnpm dev                      # http://localhost:3000
```

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server (http://localhost:3000) |
| `pnpm build` | Production build (`.output/`) |
| `pnpm preview` | Preview the production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `nuxt typecheck` (vue-tsc) |
| `pnpm test` | Vitest unit + integration tests (test DB `pps2026_test`) |
| `pnpm test:e2e` | Playwright end-to-end suite (reuses a running dev server) |
| `pnpm db:generate` | Generate a Drizzle migration from `server/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Seed demo data (dev only — wipes business tables) |
| `pnpm db:studio` | Drizzle Studio |

Services smoke script (no browser): `pnpm tsx --env-file=.env scripts/smoke-services.ts`.

## The demo chain

1. Open `/` — the symposium homepage. The rail (desktop) / top bar (mobile) shows **Sign in / Register**.
2. `Register Now` → gated by the account wall → **sign up with an email verification code** (6-digit; dev mode surfaces the code on-screen and in the server log — production mails it via SMTP, see ARCHITECTURE.md).
3. Complete the conference registration — the email is locked to your account, participant info pre-fills from your profile → order created.
4. `/payment/:id` → mock QR + waiting state → `Open simulated cashier` → simulate payment.
5. Polling flips the order to PAID → redirect to `/credential/:token` (the event pass, with QR + PDF download).
6. `/verify/:token` — what the QR encodes; shows live validity.
7. `/account` — your registrations with **payment status**, resume-payment links, credentials, and your participant profile.
8. `/scan` — staff sign-in (`staff / pps26-staff`) → scan the QR with a phone camera (or manual entry) → confirm check-in; duplicates are blocked.
9. `/admin` (`admin / pps26-admin`) — dashboard, registrations (**with per-row payment status**), orders, payments, credentials, check-ins.

> Camera QR scanning requires a secure context (https, or localhost during development). On phones without camera access the manual-entry path works identically.
> Forgot password? `/forgot-password` sends a reset code to the account email.

## Configuration

Everything an operator must fill in lives in **`.env.example`** (copy to `.env`), organised in blocks:

| Block | Variables | Effect when filled |
|---|---|---|
| Database | `DATABASE_URL` | PostgreSQL connection (required) |
| Site | `NUXT_PUBLIC_SITE_URL` | QR codes, verification links, emails (required) |
| Secrets | `NUXT_SESSION_SECRET`, `NUXT_MOCK_PAYMENT_SECRET` | session signing, mock webhooks (required in production) |
| Admin accounts | `ADMIN_PASSWORD`, `STAFF_PASSWORD` | passwords used by `pnpm db:seed` |
| **Email** | `MAIL_SMTP_HOST/PORT/SECURE/USER/PASS` + `MAIL_FROM` | switches verification codes from on-screen dev mode to real email delivery |
| **WeChat Pay** | `WECHAT_MCH_ID/APP_ID/PRIVATE_KEY/CERT_SERIAL/API_V3_KEY/PLATFORM_CERTS/NOTIFY_URL` | activates WeChat Pay in the payment page automatically |
| **Alipay** | `ALIPAY_APP_ID/PRIVATE_KEY/PUBLIC_KEY/NOTIFY_URL/GATEWAY` | activates Alipay automatically |

On boot the server prints a **configuration report** (payments / mail / database / secrets) so you can see what is still missing; `GET /api/health` exposes the same at runtime. Details: `PAYMENT.md` + `ARCHITECTURE.md`.

## Documentation

- `PLAN.md` — milestones, design system, definition of done
- `ARCHITECTURE.md` — frontend/server/database/payment/credential/admin structure
- `PAYMENT.md` — payment architecture, adapters, environment variables, production checklist
- `TEST_PLAN.md` — unit + E2E coverage
- `AGENTS.md` — engineering rules for this repository
