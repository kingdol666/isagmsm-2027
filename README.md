# README

PPS 2026 — Polymer Processing Symposium full-stack site. Docs: PLAN.md / ARCHITECTURE.md / PAYMENT.md / TEST_PLAN.md (finalized in M9).

## Quick start

```bash
pnpm install
docker compose up -d      # PostgreSQL 17 on :5433
pnpm db:migrate && pnpm db:seed
pnpm dev
```
