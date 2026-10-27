# Vercel migration

The working tree uses a Next.js Node runtime and InsForge Postgres for the shared demo. The original Cloudflare implementation and D1 migration history remain in Git history; no existing D1 data has been transferred.

## Setup

1. Provision a Postgres database and put its server-only connection string in `DATABASE_URL`. Use a pooled endpoint where the provider supports one, with certificate verification enabled.
2. Run `pnpm db:migrate` against the intended database. The checked-in migrations use a checksum ledger and transactional locking. Never replay an applied migration by editing it.
3. Set `DATABASE_URL` as a Vercel secret for the target environments. Do not commit credentials.
4. Run `pnpm typecheck`, `pnpm test:flow`, `pnpm test:db` against a dedicated test database, and `pnpm build`. Verify a preview and its shared-session lifecycle before promoting production.

The `raahi` InsForge project is a free-tier demo in the Singapore region. The separate `raahi-campus-demo` Vercel project is linked locally and has its database secret configured for preview and production. A deployment and GitHub synchronization have not yet been verified. Free-tier services can pause after inactivity.

The application remains a shared demo: session links grant all role perspectives, telemetry and incidents are simulated, and it does not provide real authentication, live hardware ingestion or emergency dispatch. Real service use requires verified identities, authorization, operational integrations and stronger production data controls.
