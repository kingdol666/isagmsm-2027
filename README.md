# ISAGMSM 2027 — 第五届先进凝胶材料与软物质国际学术研讨会

> The 5th International Symposium for Advanced Gel Materials & Soft Matters
> 2027年4月24—26日 · 合肥滨湖国际会展中心 · 中国

双应用会议平台（pnpm workspace）：

- **门户** `.`（端口 **3000**）— 公开会议网站、邮箱注册、报名、对公转账审批流、在线投稿（投稿人侧）、电子凭证与 QR、现场扫码签到（staff 端）。**不含任何管理界面与管理 API**。
- **管理台** [`admin/`](admin/README.md)（端口 **3001**，独立应用/独立会话/独立密钥）— 组织委员会后台：会员与凭证管理（绑定规则见下）、缴费审批、稿件审稿（接收/返稿邮件通知）。

两应用仅通过共享的 PostgreSQL 交换数据（迁移由门户拥有）。

Built with **Nuxt 4 · Vue 3 · TypeScript · Nitro · Nuxt UI 4 · Tailwind CSS 4 · Drizzle ORM · PostgreSQL · Vitest · Playwright**.

Visual identity: **Direction C — "The Grid as Instrument"** (Swiss International Style after Josef Müller-Brockmann), selected from three design drafts (`design-demos/`). See `PLAN.md` for the design system.

## Quick start

```bash
pnpm install
docker compose up -d          # PostgreSQL 17 on localhost:5433
pnpm db:migrate               # create schema
pnpm db:seed                  # demo data (speakers, program, participants, admin accounts)
pnpm dev                      # 门户 http://localhost:3000
pnpm dev:admin                # 管理台 http://localhost:3001（复制 admin/.env.example → admin/.env）
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
7. `/account` — your registrations with **payment status**, resume-payment links, credentials, **your abstract submissions with review results & history**, and your participant profile.
8. `/submit` — 在线投稿（标题 / 主题方向 / 报告类别 / 摘要 / 姓名 / 机构 / 作者列表，每位作者机构必填）。**支持多论文投递**（待审 ≤3 篇、累计 ≤20 篇）；个人中心可查看**稿件内容与逐版本快照历史**；待审/已返稿的稿件可**撤回**——撤回后管理台不再显示；返稿后可修改重投，审稿结果邮件通知。
9. `/scan` — staff sign-in (`staff / pps26-staff`) → scan the QR with a phone camera (or manual entry) → confirm check-in; duplicates are blocked.
10. **管理台** `http://localhost:3001`（`admin / pps26-admin`，与门户独立会话）— 参会管理（**会员开关**）、缴费审批、**稿件审稿（接收/返稿 + 意见邮件）**。

> **会员-凭证绑定规则**：凭证只发给会员 —— 管理台**设为会员**后，收款确认/手动下发才会发放 QR 凭证；**取消会员**会在同一事务内自动吊销其全部有效凭证（旧 QR 扫码立即失效）。入会操作仅限管理员（staff 只能扫码）。

## 安全加固（生产就绪）

- **SQL 注入**：全部查询走 Drizzle 参数化构建器；管理台搜索额外做 LIKE 通配符转义（`% _ \`），注入载荷按字面量存储（回归测试覆盖）。
- **反爬虫**：全端点限流（注册/登录/发码/报名/投稿/凭证下载/webhook 各自独立窗口，超限返回 429 + `Retry-After`）；`robots.txt` 禁爬敏感路径 + `Crawl-delay: 10`。
- **反作弊**：注册/报名/投稿表单蜜罐字段（隐藏输入，机器人填写即拒）；一账号仅一条有效报名；投稿上限（累计 ≤20、待审 ≤2）；管理台登录 IP 限流 + 账号名级 5 次失败锁定 15 分钟。
- **安全响应头**：nosniff、DENY framing、Referrer-Policy、Permissions-Policy（门户允许自身摄像头供扫码端使用）、COOP；生产启用 CSP（含 `frame-ancestors 'none'`）与 HSTS。
- **支付防篡改**：金额只在服务端计算；webhook HMAC/签名验证 + 幂等存储；伪造签名请求被拒且订单不受影响。
- **数据库备份**（管理台）：`pg_dump` 定时备份（`BACKUP_INTERVAL_HOURS`，默认 24h）+ 手动备份 + 保留策略（默认 14 份）+ 管理台下载；文件名白名单 + resolve 前缀校验杜绝路径穿越；恢复入口不暴露在网页（运维 `pg_restore` 手工执行）。

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
