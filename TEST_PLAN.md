# TEST_PLAN

## Layers

| Layer | Tool | Scope | Command |
|---|---|---|---|
| Unit | Vitest | pure logic (pricing) + provider signature handling | `pnpm test` |
| Integration | Vitest | domain chain against a real PostgreSQL test DB (`pps2026_test`) | `pnpm test` |
| E2E | Playwright | full user journey in a real browser | `pnpm test:e2e` |
| Smoke script | tsx | service-level chain (no browser) | `pnpm tsx --env-file=.env scripts/smoke-services.ts` |

The test database is created once with:

```bash
docker exec pps-postgres createdb -U pps pps2026_test
DATABASE_URL=postgresql://pps:pps_dev_pw@localhost:5433/pps2026_test pnpm db:migrate
```

`pnpm test` falls back to that URL automatically.

## Unit coverage

- `pricing.service.test.ts` — early-bird discount windows (before/at/after the deadline), free tier, fen rounding.
- `mock-provider.test.ts` — webhook signature: valid, wrong, tampered body, unknown result, malformed JSON.
- `auth.service.test.ts` — sign-up with code (account created + verified), duplicate sign-up rejected, wrong codes and the 5-attempt burn, resend cooldown, login (ok / wrong password / unknown user), password reset (code works, old password dies, wrong codes rejected).
- `abstract.service.test.ts` — 投稿状态机：submit + 事件记录、接收（附意见 + 邮件 spy）、已审结不可再审、返稿 → 重投版本 +1 → 再接收、他人重投 403、未返稿重投 409、返稿意见 ≥5 字校验。

## Integration coverage (`domain-chain.test.ts`)

1. Order priced server-side from the registration type (no client amounts).
2. Pending order reuse (no duplicate orders per registration).
3. PAID callback → single processing; repeated callback = duplicate; order actually transitions once; credential issued idempotently.
4. Amount-tampered callback rejected; payment fails; order untouched.
5. Guarded transition `pending → paid` applies exactly once.
6. Credential verifies → first check-in succeeds → second reports `duplicate` with the same timestamp → verification shows checked-in.
7. Unknown tokens rejected with `not_found`.

## E2E coverage (Playwright — `tests/e2e/`, `pnpm test:e2e`)

| Spec | Coverage |
|---|---|
| `full-flow.spec.ts` | **THE critical smoke test**: homepage → gated register → email-code sign-up → conference registration (locked email, prefilled profile) → order → bank-transfer page (participant ID + 附言) → submit claim → admin approves in 缴费审批 → credential issued → verify page → `/account` shows paid → scanner check-in → admin list reflects it |
| `auth.spec.ts` | wrong code rejected, resend cooldown (disabled + countdown), duplicate sign-up rejected, sign-out, forgot-password full recovery, wrong login rejected, `/account` gating |
| `admin.spec.ts` | anonymous API 401, wrong admin password 401, dashboard counts + revenue, all five admin lists render, registrations table with per-row payment status + search filter, staff role separation (403 on admin APIs) |
| `scanner.spec.ts` | staff login gate, unknown code → NOT RECOGNISED, valid credential (claim + admin approval fixture) → verify → confirm → duplicate blocked → record visible in admin check-ins |
| `misc.spec.ts` | `/api/health` integrations report, styled 404 page, robots.txt + sitemap.xml, JSON-LD structured data + header nav, all seven conference pages render, profile save/persist, 390 px homepage zero overflow |
| `abstract-flow.spec.ts` | 投稿送审闭环：在线投稿（动态添加作者行）→ 个人中心待审 + 历史 → 后台搜索/展开/返稿（意见必填）→ 投稿人看到返稿意见 → 修改重投（预填表单，版本 +1）→ 后台接收 → 投稿人看到已接收 + 完整历史（返稿/重投/接收） |

Run against a dev server (`reuseExistingServer`); the suite sets `RATE_LIMIT_DISABLED=1` for the server it starts (test-only bypass, never active in production builds — see `server/utils/rate-limit.ts`).

## Manual verification checklist (per release)

- [ ] `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:e2e` · `pnpm build` all green
- [ ] Responsive pass at 375 / 390 / 414 / 768 / 1024 / 1280 / 1440 / 1920 (scripts/shoot.mjs, scripts/shoot-flow.mjs, scripts/shoot-qa.mjs capture these)
- [ ] Visual QA against Direction C (rail/footer separation, palette, no forbidden aesthetics)
- [ ] PDF downloads and opens; QR in the PDF decodes to the verify URL
- [ ] `/scan` camera path on a phone (https) and the manual path everywhere
