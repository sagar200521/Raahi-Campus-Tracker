# Planned Vercel migration

**Status: planned, not implemented or deployed.** The user intends to make further changes after the GitHub push, then provide Vercel CLI access. Do not claim that a Vercel project already exists or that this branch can deploy unchanged.

## Current blockers

| Current dependency                                  | Why it needs work on Vercel                                                |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| Vinext/Vite Worker build                            | Current output is a Cloudflare Worker, not a standard Vercel Next.js build |
| `cloudflare:workers` imports                        | Runtime binding access is unavailable in a normal Vercel function          |
| D1 `env.DB`                                         | Vercel does not automatically provision this binding or migrate its data   |
| Worker/Sites Vite plugins and dispatch auth helpers | Platform-specific; retained for the current host                           |
| One JSON session record with optimistic D1 updates  | The chosen replacement database needs equivalent atomic version checks     |

Adding `vercel.json` or running a deployment command alone will not resolve these dependencies.

## Proposed path after the next product changes

1. Create a migration branch from the public repository; preserve a reference to the current Cloudflare implementation.
2. Move the application to a normal Next.js build (`next dev`, `next build`, `next start`) and remove Worker-only entrypoints/config from the Vercel path. Keep React views, mapping, reducer behavior and assets.
3. Introduce a server-only persistence adapter. Choose a database compatible with the target Vercel runtime (for example, managed Postgres). Confirm the service, account, region and budget with the owner before provisioning paid resources.
4. Reproduce session creation, expiry, state reads and atomic versioned writes. Migrate schema and data explicitly; do not assume the hosted D1 database transfers with the code.
5. Keep secrets in Vercel environment settings. Add a documented `.env.example` only once the required variables are actually known. Do not commit tokens or connection strings.
6. If this is becoming a real service, replace demo role selection with verified accounts, server-side role permissions, driver enrolment and audit logging before handling real people or device telemetry.
7. Run type checks, reducer/routing tests, production builds, API integration/concurrency tests and browser checks.
8. With Vercel CLI access available, create a preview deployment, verify the database and session flow there, then publish production under the approved domain.

## Acceptance criteria

- Student requests are visible to the selected driver's authenticated workspace and to authorized Admin users, or remain explicitly labelled shared-demo behavior if production identity is still deferred.
- Two concurrent accepts cannot assign two active trips to one driver.
- Session state persists across restarts/devices; expiry remains server-enforced.
- Real map data, route accuracy caveats, project assets and attribution remain intact.
- Overspeed threshold, incident history, resolution notes and stale telemetry behavior remain correct.
- Public URL, environment revision, migration outcome and remaining integration limits are recorded after a verified deployment.

No Vercel CLI token is needed for the current GitHub export. Request authentication when the migration is ready to deploy, using a supported CLI login flow rather than asking for secrets in chat.
