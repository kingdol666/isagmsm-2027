# TEST_PLAN

## Layers

| Layer | Tool | Scope | Command |
|---|---|---|---|
| Unit | Vitest | pure logic (pricing) + provider signature handling | `pnpm test` |
| Integration | Vitest | domain chain against a real PostgreSQL test DB (`pps2026_test`) | `pnpm test` |
| E2E | Playwright | full user journey in real browsers（双应用：门户 3000 + 管理台 3001） | `pnpm test:e2e` |
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
- `abstract.service.test.ts` — 投稿状态机：submit + 事件记录、接收（附意见 + 邮件 spy）、已审结不可再审、返稿 → 重投版本 +1 → 再接收、他人重投 403、未返稿重投 409、返稿意见 ≥5 字校验；**版本内容快照**（投稿/重投各存一份）、**撤回**（仅本人/仅待审与已返稿、管理台列表不可见、不可逆、历史与快照保留）。

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
| `admin.spec.ts` | 独立管理台：匿名 401、错密码 401、staff 被拒 403、门户管理面已剥离（/api/admin/** 404）、仪表盘统计、会员-凭证绑定全链路（非会员收款不发证 → 设会员下发 → 取消会员自动吊销） |
| `scanner.spec.ts` | staff login gate, unknown code → NOT RECOGNISED, valid credential（管理台先设会员再审批的 fixture）→ verify → confirm → duplicate blocked → verify 页显示已签到 |
| `admin-credential-flow.spec.ts` | 会员凭证闭环（多浏览器上下文）：管理台设会员 → 收款确认下发 → 用户头像区凭证 → 扫码有效 → 撤销 → 扫码已撤销 → 恢复 → 有效 → **取消会员自动吊销** → 扫码/verify 均被拒 |
| `misc.spec.ts` | `/api/health` integrations report, styled 404 page, robots.txt + sitemap.xml, JSON-LD structured data + header nav, all seven conference pages render, profile save/persist, 390 px homepage zero overflow |
| `abstract-flow.spec.ts` | 投稿送审闭环（审稿在管理台 3001）：在线投稿（动态添加作者行）→ 个人中心待审 + 历史 → 管理台搜索/展开/返稿（意见必填）→ 投稿人看到返稿意见 → 修改重投（预填表单，版本 +1）→ 管理台接收 → 投稿人看到已接收 + 完整历史（返稿/重投/接收） |
| `abstract-withdraw.spec.ts` | 投稿完整设计：同一账号**多论文投递**（两篇连续投稿）→ 投稿人展开查看**当前稿件内容 + 投稿版本快照** → **撤回稿件 A**（确认弹窗 → 已撤回徽章 + 撤回事件，撤回/重投按钮消失）→ **管理台搜索 A 不再显示**、B 正常待审且管理台可见其投稿快照历史 |

Run against BOTH dev servers (`reuseExistingServer`): the portal gets `RATE_LIMIT_DISABLED=1` + `MAIL_DRIVER=test`（devCode 显示在页面上），the console gets `MAIL_DRIVER=test`（审稿邮件写日志）。Playwright `webServer` 数组同时拉起两应用。

单元层另覆盖：会员-凭证绑定（`abstract.service.test.ts`：取消会员自动吊销；`domain-chain.test.ts`：非会员 PAID 回调不签发凭证）。

## Manual verification checklist (per release)

- [ ] `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:e2e` · `pnpm build` all green
- [ ] Responsive pass at 375 / 390 / 414 / 768 / 1024 / 1280 / 1440 / 1920 (scripts/shoot.mjs, scripts/shoot-flow.mjs, scripts/shoot-qa.mjs capture these)
- [ ] Visual QA against Direction C (rail/footer separation, palette, no forbidden aesthetics)
- [ ] PDF downloads and opens; QR in the PDF decodes to the verify URL
- [ ] `/scan` camera path on a phone (https) and the manual path everywhere
