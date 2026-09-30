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
| M13 | **安全加固**：安全响应头/CSP/HSTS、限流器重构+扩展、蜜罐×3、一账号一报名、投稿上限、登录锁定、LIKE 转义、管理台数据库定时备份；三路 subagent 红队测试并修复 V-1/V-3/V-4 | ✅ Done |
| M14 | **投稿闭环完善**：投稿人可见稿件内容与逐版本快照历史、撤回稿件（管理台不再显示）、多论文投递（待审 ≤3 / 累计 ≤20，已撤回不计） | ✅ Done |
| M16 | **全站中英文 i18n**：自研轻量 i18n（cookie 持久化 pps_locale、SSR 同源渲染、零新依赖）；页头「中文/EN」切换按钮即时切换并跨会话保持；全部页面 UI 文案 + 全站内容数据双语（shared/i18n 切片 + site-en.ts 内容镜像 + 奇偶校验单测）；html lang 动态化；默认中文（服务端校验消息暂为中文） | ✅ Done |
| M15 | **投稿附件 OSS**：docker compose 增加对象存储容器（S3 兼容，宿主端口 9100）；投稿/重投必附 Word/PDF 附件（≤10MB，魔数校验），每版独立存档；门户与管理台均可按版本下载；UI 中文化 + 表单交互优化（脏状态/内联错误/锚点导航） | ✅ Done |

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

Registered accounts submit abstracts at `/submit`（标题 / 主题方向 A–F / 报告类别 / 摘要正文 / 姓名 / 机构 / 作者列表——每位作者的姓名与机构均必填）。Admin reviews at `/admin/abstracts`: accept（附审稿意见）or return（返稿意见必填，≥5 字，邮件发送至投稿人注册邮箱）。Returned abstracts can be revised & resubmitted（版本 +1，回到待审）。每次投稿/重投必须附带稿件附件（Word/PDF，≤10MB，服务端做扩展名白名单 + 魔数嗅探 + 大小校验），对象存入 docker compose 提供的对象存储容器（S3 兼容协议，RustFS 实现，宿主端口 9100；MinIO 已停止公开发布镜像故不采用），每个版本独立存档。

`abstract_events` records the full history（投稿/重投/接收/返稿 + 意见 + 每版附件元数据），visible to the submitter at `/account#abstracts` and to admins inline；两侧均可按版本下载附件（门户仅属主、管理台需会话）。

## 6. Testing

- Vitest unit: pricing, order/payment state machines, credential tokens, check-in rules, abstract review state machine, validation schemas.
- Playwright E2E smoke (must always pass): homepage → register → order → mock pay → payment success → credential → QR verify → admin login → check-in → dashboard reflects it; abstract: submit → return → resubmit → accept → history.

Commands: `pnpm dev | build | lint | typecheck | test | test:e2e | db:migrate | db:seed`.

## 7. Definition of done

App runs · registration works · mock payment works · credentials work · QR verification works · check-in works · admin works · unit + E2E tests pass · lint passes · typecheck passes · production build passes · responsive verified at 375/390/414/768/1024/1280/1440/1920.
