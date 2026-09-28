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

## Integration coverage (`domain-chain.test.ts`)

1. Order priced server-side from the registration type (no client amounts).
2. Pending order reuse (no duplicate orders per registration).
3. PAID callback → single processing; repeated callback = duplicate; order actually transitions once; credential issued idempotently.
4. Amount-tampered callback rejected; payment fails; order untouched.
5. Guarded transition `pending → paid` applies exactly once.
6. Credential verifies → first check-in succeeds → second reports `duplicate` with the same timestamp → verification shows checked-in.
7. Unknown tokens rejected with `not_found`.

## E2E coverage (`tests/e2e/full-flow.spec.ts`)

**THE critical smoke test (PLAN §33):**

homepage → `Register Now` → select Academic → fill participant info → confirm → order created → payment page (QR, waiting) → simulated cashier → successful payment → automatic redirect to the credential pass → verify page shows `Valid credential` → admin login → dashboard visible → `/scan` manual-entry check-in → `Confirm check-in` → success logged → `/admin/checkins` lists the participant.

Plus: homepage renders at 390 px with zero horizontal overflow.

## Manual verification checklist (per release)

- [ ] `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:e2e` · `pnpm build` all green
- [ ] Responsive pass at 375 / 390 / 414 / 768 / 1024 / 1280 / 1440 / 1920 (scripts/shoot.mjs, scripts/shoot-flow.mjs, scripts/shoot-qa.mjs capture these)
- [ ] Visual QA against Direction C (rail/footer separation, palette, no forbidden aesthetics)
- [ ] PDF downloads and opens; QR in the PDF decodes to the verify URL
- [ ] `/scan` camera path on a phone (https) and the manual path everywhere
