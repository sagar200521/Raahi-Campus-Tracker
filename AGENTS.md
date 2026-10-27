# Instructions for agents working on Raahi

Read `README.md`, `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, and `design/README.md` before changing product behavior. Check `docs/VERCEL_MIGRATION.md` before deployment work.

## Preserve the product

- Preserve the Raahi branding, tagline, three role-specific dashboards, actual geographic campus map and original project evidence.
- Vehicle telemetry is simulated. Never present demo values, possible collisions or demo SOS as live data, confirmed accidents or real dispatch.
- A role dropdown is not authorization. Anyone holding a demo-session link can operate every perspective; retain that explanation until real authorization exists.
- Real location permission must be initiated only by the user's geolocation button.
- Do not invent landmark coordinates, phone numbers, live ETAs or road routes.

## Code and data

- Keep server-side validation and lifecycle transitions in `app/fleet.ts`; UI checks alone are insufficient.
- Preserve optimistic version checks on D1 writes. Concurrent driver acceptance must not assign two active rides to one vehicle.
- Speed alerts trigger at `speed > 25`, not at `speed >= 25`.
- Keep stale telemetry explicit at the five-minute threshold; do not silently refresh data to make a vehicle appear live.
- Apply one SQL statement per D1 `prepare()` call. Do not create migration-owned tables during request handling.
- Existing applied migrations and Drizzle metadata are immutable. Append new migrations for schema changes.
- Do not commit session keys, database snapshots, credentials, `.env` files, `.wrangler/`, `.sites-runtime/`, `.vercel/`, `node_modules/`, build output or archive files.
- Preserve OpenStreetMap and upstream component attribution.

## Validation

Run the relevant checks:

```bash
pnpm typecheck
pnpm test:flow
pnpm build
```

For workflow changes, verify request → acceptance → pickup → arrival → start → completion, cancellation, stale samples and incident resolution. For design changes, inspect desktop and a narrow mobile viewport. Add focused tests for new failure modes; avoid tests that only duplicate implementation.

## Deployment boundaries

The checked-in app currently targets Cloudflare Workers/D1. Do not claim it is Vercel-ready or deploy it as a static GitHub Pages site. The user plans further changes, then a Vercel migration after CLI access is available. Do not deploy or change the current public Site merely because documentation is edited.

Use GitHub CLI for repository work when requested. Inspect the target repository before pushing; never force-push or overwrite an existing repository without explicit instructions. Keep authentication outside the checkout.

<!-- INSFORGE:START -->
## InsForge backend

This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **raahi** (API base `https://8qg88758.ap-southeast.insforge.app`)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** app code reads keys from `.env.local`; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.
<!-- INSFORGE:END -->
