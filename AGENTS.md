# AGENTS.md

## Project

This repository is the full-stack website and registration platform for:

The 5th International Symposium for Advanced Gel Materials & Soft Matters (ISAGMSM 2027 / 第五届先进凝胶材料与软物质国际学术研讨会).

## Primary Goal

Build a premium international academic symposium website with:

* public conference website
* registration
* orders
* payments
* electronic credentials
* QR verification
* check-in
* admin dashboard

## Stack

Use:

* Nuxt 4
* Vue 3
* TypeScript
* Nitro
* Nuxt UI 4
* Tailwind CSS 4
* Drizzle ORM
* PostgreSQL
* Vitest
* Playwright

Do not introduce another backend framework.

## Architecture

Use Nuxt as the unified frontend and backend.

Frontend:

app/

Server:

server/

Shared types and schemas:

shared/

Database access must be isolated inside:

server/db/
server/repositories/

Business logic must be isolated inside:

server/services/

Payment integrations must be isolated inside:

server/payments/

## Design

The visual direction is inspired by modern international academic symposium websites, especially:

https://ecsymposium.com/

Do not copy the reference website.

ISAGMSM 2027 must have its own visual identity.

Preferred characteristics:

* editorial
* minimal
* premium
* academic
* industrial
* materials-science
* international

Avoid generic SaaS visual language.

Avoid excessive:

* gradients
* glassmorphism
* neon
* purple AI aesthetics
* 3D effects
* particles
* decorative animations

The approved visual direction is **Direction C — "The Grid as Instrument" (Swiss International Style, after Josef Müller-Brockmann)**, selected from three design drafts on 2026-09-28 (see `design-demos/direction-approved.md`).

## UX

Mobile is a first-class platform.

Never treat mobile as a reduced desktop layout.

Verify all important screens at:

375px
390px
414px
768px
1024px
1280px
1440px
1920px

## Coding Principles

Prefer:

* simple code
* strong typing
* reusable components
* clear domain boundaries
* server-side validation
* explicit business logic
* readable naming
* minimal dependencies

Avoid premature abstraction.

Avoid unnecessary state management.

Do not introduce Pinia unless clearly necessary.

## Security

Never expose secrets in client code.

Never trust client-provided:

* price
* payment status
* registration status
* admin authorization

Payment callbacks must be verified and idempotent.

## Testing

Every major feature must have automated validation.

Use:

Vitest for unit tests.

Playwright for end-to-end tests.

At minimum, maintain one complete:

registration → order → mock payment → credential → QR verification → check-in

E2E flow.

## Milestone Rule

Work milestone by milestone.

After each milestone:

1. run tests
2. run lint
3. run typecheck
4. run build when applicable
5. inspect the result
6. fix failures
7. only then continue

Never knowingly carry broken code into the next milestone.

## Scope Discipline

Do not expand the project scope without a strong reason.

V1 priority:

1. visual quality
2. registration
3. payment
4. credential
5. check-in
6. admin

## Documentation

Keep these files current:

PLAN.md
TEST_PLAN.md
ARCHITECTURE.md
PAYMENT.md
README.md

When an architectural decision changes, update the documentation.

## Completion Standard

Do not declare the project complete because the UI renders.

The project is complete only when:

* the application runs
* core registration works
* mock payment works
* credential generation works
* QR verification works
* check-in works
* admin works
* tests pass
* typecheck passes
* lint passes
* production build passes
* responsive layouts have been verified
