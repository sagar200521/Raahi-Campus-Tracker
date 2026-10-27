# Raahi

**Your campus. Connected.**

Raahi is an IIT Roorkee B.Tech project demonstrating campus e-rickshaw coordination: student pickup requests, driver trip management, and a security dashboard for fleet telemetry and incidents.

**Project contributors:** Sagar Baruah and Ponting.  
**Current public demo:** https://campus-fleet-btp.justbat256.chatgpt.site/

> This is a functional shared demonstration, not an operational transport or emergency service. Vehicle positions and incident events are simulated. Role switching is not production authentication.

## What works

| Area             | Implemented features                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Student          | Campus pickup/destination selection, map-point selection, optional geolocation, nearby vehicles, passenger count, pickup requests, cancellation with a reason, ride history, device-local saved places |
| Driver           | Online/offline status, available seats, accepting/declining requests, heading to pickup, arrived, start ride, complete ride, external navigation, demo SOS                                             |
| Admin / Security | Fleet search and filters, stale/offline indicators, trip records, overspeed/collision/SOS inbox, acknowledgement, review, resolution notes, JSON activity export                                       |
| Shared workspace | Cloud-persisted demo sessions, cross-device session links, 4-second polling, optimistic concurrency checks, seven-day session expiry                                                                   |
| Map              | Geographic OpenStreetMap campus roads/buildings, ten sourced landmarks, pan/zoom, light/dark styles, local mapped-road route previews                                                                  |

Speed alerts trigger **strictly above 25 km/h**. Possible collisions require human verification; they are not confirmed accidents.

## Stack and current hosting

- React 19, TypeScript, Next-compatible App Router components and route handlers.
- **Vinext + Vite**, built for **Cloudflare Workers**.
- **Cloudflare D1** for shared demo sessions; Drizzle schema and checked-in SQL migrations.
- Vendored **Leaflet 1.9.4**, OpenStreetMap geographic data, Lucide icons, custom CSS.
- pnpm lockfile; Node.js **24** recommended.

**GitHub holds the source. It does not by itself host this server application.** The existing demo stays on its current host. Vercel deployment is a later step: the Worker entrypoint, Cloudflare bindings and D1 access must first be adapted. See [the Vercel migration plan](docs/VERCEL_MIGRATION.md).

## Quick start

Use Node 24 and the pnpm version in `package.json`:

```bash
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:flow
pnpm build
```

Initialize a **new local preview database** with the checked-in schema migration:

```bash
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_dizzy_avengers.sql
pnpm dev
```

Open the URL printed by the dev server (normally `http://localhost:5173`). Apply that migration once per local database. Later migrations must be applied in order; do not replay an already applied migration. Rebuild after changing binding configuration. Local D1 data is separate from the hosted demo.

A clean clone defaults to the portable execution profile. Do not copy `.sites-runtime/`, `.wrangler/`, credentials, or production database contents from another machine.

## Try the workflow

1. Open the Student dashboard and choose two campus stops, passengers and an available vehicle.
2. Request a ride. Use **Share session** to open the same workspace on another device.
3. Switch that device to Driver and select the requested vehicle.
4. Accept, head to pickup, mark arrived, start and complete the ride.
5. Open Admin / Security to inspect the trip. Use **Demo controls** to send a speed sample above 25 km/h or a possible-collision event.
6. Acknowledge, review and resolve an incident; resolution requires a note.

Samples become stale after five minutes. Send a stationary sample through Demo controls or go online from the Driver view to refresh a demo vehicle. Never use these controls as proof of live hardware integration.

## Repository map

| Path                             | Purpose                                                          |
| -------------------------------- | ---------------------------------------------------------------- |
| `app/dashboard.tsx`              | Student, Driver, Admin, project views and shared client workflow |
| `app/campus-map.tsx`             | Interactive geographic campus map                                |
| `app/routing.ts`                 | Local road graph and route calculation                           |
| `app/fleet.ts`                   | Initial demo fleet, validation and state transitions             |
| `app/api/session/route.ts`       | Creates expiring demo sessions                                   |
| `app/api/state/route.ts`         | Reads state and applies optimistic updates                       |
| `app/globals.css`                | Branding, layout, responsive styles and map presentation         |
| `db/`, `drizzle/`                | D1 schema, SQL migration and Drizzle metadata                    |
| `public/campus.json`             | OpenStreetMap snapshot, routing network and sourced landmarks    |
| `public/assets/`                 | Logo, hardware photo/video, project report and presentation      |
| `public/vendor/`                 | Vendored Leaflet files                                           |
| `design/`                        | Brand source, design tokens and interface specification          |
| `scripts/`, `worker/`, `vendor/` | Checks, build/development support and current Worker runtime     |
| `components/`, `hooks/`, `lib/`  | Retained starter primitives and optional integration helpers     |
| `.openai/hosting.json`           | Current Sites/D1 hosting declaration; no credentials             |

## Developer and agent documentation

- [Project context and current status](docs/CONTEXT.md)
- [Architecture and persistence](docs/ARCHITECTURE.md)
- [API contract](docs/API.md)
- [Development, tests and troubleshooting](docs/DEVELOPMENT.md)
- [UI and brand guidelines](design/README.md)
- [Vercel migration and deployment plan](docs/VERCEL_MIGRATION.md)
- [Next implementation priorities](docs/ROADMAP.md)
- [Agent instructions](AGENTS.md)
- [Contribution process](CONTRIBUTING.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

## Data and production limitations

Anyone with a shared demo-session link can use every demo role in that session. The session key is a bearer capability, not a verified account or role. Avoid real rider names, contact information and sensitive location data in demo workspaces. Production authentication, authorized driver enrolment, hardware ingestion and real security dispatch are not connected.

Routes follow mapped vehicle roads and one-way tags, not live traffic or verified gate access. Travel time uses an assumed 12 km/h and excludes pickup wait and the distance from a building point to its nearest road. It is not a live ETA.

## Attribution and licensing

Map data: **© OpenStreetMap contributors**, licensed under the [Open Database License](https://www.openstreetmap.org/copyright). Landmark source URLs are included in the data. Leaflet and retained platform code keep their upstream notices.

No new license for Raahi's original application code or project media has been selected by the owners in this export. Public visibility alone does not grant a reuse license. See [third-party notices](THIRD_PARTY_NOTICES.md) before redistributing components or data.
