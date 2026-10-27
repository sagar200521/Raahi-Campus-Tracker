# Development guide

## Prerequisites

- Node.js 24 recommended (the flow test uses Node's built-in TypeScript stripping).
- pnpm 11.25.0, pinned in `package.json`.
- Git. GitHub CLI (`gh`) is used for repository operations.

Use `pnpm install --frozen-lockfile` in a clean checkout. The project is standalone and retains its own lockfile, package policy and platform helpers. `package.json` is marked private to prevent accidental npm publication; the GitHub repository can still be public.

## Commands

| Command            | Purpose                                            |
| ------------------ | -------------------------------------------------- |
| `pnpm dev`         | Portable local Vinext development server           |
| `pnpm typecheck`   | TypeScript checks without emitting output          |
| `pnpm test:flow`   | Domain and road-routing checks                     |
| `pnpm build`       | Current Cloudflare/Vinext production artifact      |
| `pnpm start`       | Wrangler local preview of the built Worker         |
| `pnpm db:generate` | Generate new Drizzle migrations after schema edits |

The initial local D1 setup command is in the root README. Use `.wrangler/state` for both development and built previews; do not append `/v3` manually. Production data is not included in this repository.

## Validation coverage

`scripts/check-flow.ts` checks:

- Request idempotency, a single active request per demo student, single active driver assignment and ordered trip stages.
- Cancellation, campus bounds and stale vehicle rejection.
- Exact speed boundary: 25 km/h does not alert; a higher sample does.
- Unresolved overspeed deduplication and resolution-note requirements.
- Collision/SOS state creation.
- Connectivity across the ten mapped stops.

It is a reducer/routing test, not a concurrent D1 integration or browser end-to-end suite. A public-deployment check previously confirmed that a submitted request survives a reload. Browser checks covered the normal ride lifecycle, incident handling, desktop and narrow-screen layouts.

For new backend work, add real API concurrency tests covering simultaneous accepts and compare-and-swap retries. Do not treat the reducer checks as proof of database isolation.

## Manual acceptance checks

1. Create a fresh demo workspace. Keep the session link in a temporary local note, never a commit.
2. Share it between two devices; request from Student, accept and complete from Driver, inspect from Admin.
3. Try an unavailable vehicle and a second active request. Both must be rejected.
4. Refresh demo telemetry, then verify stale indicators after five minutes.
5. Send 25 km/h and a sample above 25 km/h; verify the exact threshold and deduplication.
6. Create a possible collision, acknowledge, review and resolve with a note.
7. Verify map pan/zoom, source landmarks, route changes, mobile booking and keyboard dialog navigation.
8. Check downloads and project media.

## Troubleshooting

**All demo vehicles are stale:** send fresh stationary samples in Demo Controls or use Driver's online action. Polling must not manufacture fresh telemetry.

**Session expired:** create a fresh workspace. Sessions expire after seven days; current session reads enforce expiry, but automatic physical database cleanup is not implemented.

**D1 table missing locally:** build once, apply the pending local migration once, then restart the dev server. Do not apply a local command to a remote database.

**No road route:** choose other stops. The graph may be disconnected or an endpoint too far from a mapped node. Do not draw a fake straight-line route as a replacement.

**Build/runtime requires Cloudflare:** expected for this snapshot. See `VERCEL_MIGRATION.md` before attempting Vercel.

**Clean clone has no execution profile:** it defaults to portable. `.sites-runtime` is ignored and must not be committed. Original platform-specific instructions remain in `PLATFORM_RUNTIME.md`.
