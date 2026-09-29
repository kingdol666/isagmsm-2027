# ISAGMSM 2027 — 第五届先进凝胶材料与软物质国际学术研讨会 · Development Plan

> The 5th International Symposium for Advanced Gel Materials & Soft Matters
> 2027年4月24—26日 · 合肥滨湖国际会展中心 · 中国

Full-stack symposium website: public site + registration + orders + payments + electronic credentials + QR verification + on-site check-in + admin dashboard.

## 0. Status

| Milestone | Scope | Status |
|---|---|---|
| M0 | Project foundation (Nuxt 4, TS, tooling, DB container) | ✅ Done |
| M1 | Visual system (Direction C, Swiss Grid) | ✅ Done |
| M2 | Homepage (11 sections, Direction C port, footer fix) | ✅ Done |
| M3 | Database (schema, migrations, seed, repositories, services) | ✅ Done |
| M4 | Registration flow (email registration, form, order) | ✅ Done |
| M5 | Mock payment (provider, cashier, webhook, state machine) | ✅ Done |
| M6 | Credential (QR token, credential page, verify page, PDF) | ✅ Done |
| M7 | Admin dashboard + standalone check-in scanner | ✅ Done |
| M8 | Real payment adapters (WeChat Pay / Alipay, ready-for-keys) | ✅ Done |
| M9 | Tests, polish, SEO, performance, docs | ✅ Done |
| M10 | Accounts: header sign-in, email-code sign-up, forgot password, profile, account-gated registration, admin payment column | ✅ Done |
| M11 | Abstract review (投稿送审)：/submit 投稿、管理台审稿（接收/返稿 + 意见邮件）、版本与历史 | ✅ Done |
| M12 | **管理台解耦**：独立应用 admin/（端口 3001、pps_console 会话、独立密钥），门户剥离全部管理面；会员-凭证强绑定（仅会员发证、取消会员自动吊销、仅 admin 可操作入会） | ✅ Done |

All milestones verified: `pnpm lint` ✓ · `pnpm typecheck` ✓ · `pnpm test` (24) ✓ · `pnpm test:e2e` (2) ✓ · `pnpm build` ✓ · responsive 375→1920 ✓ · visual QA 7/7 pages pass.

## 1. Hard constraints

- Stack: Nuxt 4 + Vue 3 + TypeScript + Nitro + Nuxt UI 4 + Tailwind CSS 4 + Drizzle ORM + PostgreSQL + Vitest + Playwright. No other backend framework.
- Directory boundaries: DB access only in `server/db/` + `server/repositories/`; business logic only in `server/services/`; payment integrations only in `server/payments/`; shared types/schemas in `shared/`.
- All conference facts (dates, venue, organisers) live in DB/config data — never hard-coded in Vue pages.
- Registration prices live in the database; the server is the single source of truth for pricing (`RegistrationPricingService`).
- Never trust client-provided price / payment status / registration status / admin authorization.
- Payment callbacks must be signature-verified and idempotent; `payment_events` records every callback.

## 2. Visual system — Direction C, "The Grid as Instrument"

Swiss International Style after Josef Müller-Brockmann, selected by the user from three design drafts (`design-demos/`, decision recorded in `design-demos/direction-approved.md`).

- Tokens: paper `#F7F6F2`, ink `#111111`, grey `#6B6B66`, copper `#B45F3A` (+ lightness variants `#9A4E2E` / `#D9885F`), hairlines ink @ 18%.
- Type: Instrument Serif (display) · Inter (body) · IBM Plex Mono (codes/labels), self-hosted via `@nuxt/fonts`.
- Motifs: the continuous baseline (left index rail hairline), film cross-section strata (five hairlines, one copper "melt"), industrial batch codes `ISAGMSM—xx`, FIG.-numbered abstract graphics.
- Known fix applied during port: the desktop index rail is `position:fixed`; the footer (colophon) must live **inside the main content column** (`margin-left: var(--rail-w)`) so the rail never covers it.
- Forbidden: purple gradients, glassmorphism, neon, AI-glow, SaaS card walls, particles, decorative animation. Animation budget: hover, tabs, scroll-spy only.

## 3. Architecture

```
app/          pages, components (site/ conference/ registration/ payment/ credential/ admin/ scan/), layouts
server/       api/, services/, repositories/, db/ (schema, migrations, seed), payments/, utils/, middleware
shared/       types/, schemas/, content/ (CMS-like site content data)
tests/        unit/ (Vitest), e2e/ (Playwright)
```

Database (PostgreSQL 17, Docker, port 5433): `users, registration_types, registrations, orders, payments, payment_events, credentials, checkins, speakers, program_sessions, program_items, venues, sponsors, site_settings, admin_users`.

Domain chain: `User → Registration → Order → Payment → Credential → Check-in` (five separate entities, never merged).

APIs: `/api/registrations`, `/api/orders`, `/api/payments/*`, `/api/credentials/:token`, `/api/checkin/*`, `/api/abstracts*`（投稿送审）, `/api/program`, `/api/speakers`, `/api/registration-types`, `/api/admin/*` (see ARCHITECTURE.md).

## 4. Payment strategy

Adapter pattern in `server/payments/`: `MockPaymentProvider` (complete, default in dev) + `WeChatPayProvider` / `AlipayProvider` (full adapter implementations, activated by env keys; signature verification + idempotent webhooks). Amounts are always computed server-side; callbacks are HMAC/signature verified; order transitions are transaction-safe (`WHERE status = 'pending'`). See PAYMENT.md.

## 5. Check-in (standalone scanner)

`/scan` is a standalone mobile-first staff app (camera QR scan + manual code entry → verify → confirm check-in; duplicate check-in is blocked by a unique constraint). It is designed so a future WeChat mini-program can reuse the exact same `/api/checkin/*` endpoints.

## 5.5 Abstract review (投稿送审)

Registered accounts submit abstracts at `/submit`（标题 / 主题方向 A–F / 报告类别 / 摘要正文 / 姓名 / 机构 / 作者列表——每位作者的姓名与机构均必填）。Admin reviews at `/admin/abstracts`: accept（附审稿意见）or return（返稿意见必填，≥5 字，邮件发送至投稿人注册邮箱）。Returned abstracts can be revised & resubmitted（版本 +1，回到待审）。`abstract_events` records the full history（投稿/重投/接收/返稿 + 意见），visible to the submitter at `/account#abstracts` and to admins inline.

## 6. Testing

- Vitest unit: pricing, order/payment state machines, credential tokens, check-in rules, abstract review state machine, validation schemas.
- Playwright E2E smoke (must always pass): homepage → register → order → mock pay → payment success → credential → QR verify → admin login → check-in → dashboard reflects it; abstract: submit → return → resubmit → accept → history.

Commands: `pnpm dev | build | lint | typecheck | test | test:e2e | db:migrate | db:seed`.

## 7. Definition of done

App runs · registration works · mock payment works · credentials work · QR verification works · check-in works · admin works · unit + E2E tests pass · lint passes · typecheck passes · production build passes · responsive verified at 375/390/414/768/1024/1280/1440/1920.
