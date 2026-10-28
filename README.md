# Raahi

**Your campus. Connected.**

Raahi is an IIT Roorkee B.Tech project demonstrating campus e-rickshaw coordination: student pickup requests, driver trip management, and a security dashboard for fleet telemetry and incidents.

**Project contributors:** Sagar Baruah and Ponting.  
**Current public demo:** https://campus-fleet-btp.justbat256.chatgpt.site/

> This is a functional shared demonstration, not an operational transport or emergency service. Fleet vehicle positions and incident events are simulated. The separately labelled TTN device panel can show hardware uplinks when configured. Role switching is not production authentication.

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
- **Next.js** on Node.js, with Vercel deployment configuration.
- **InsForge Postgres** for shared demo sessions; checked-in SQL migrations and atomic version checks.
- Vendored **Leaflet 1.9.4**, OpenStreetMap geographic data, Lucide icons, custom CSS.
- pnpm lockfile; Node.js **24** recommended.

**GitHub holds the source.** The existing public demo remains on its current host. The Next.js migration uses a separate Postgres database; deployment status and setup are described in [the Vercel migration plan](docs/VERCEL_MIGRATION.md).

## Quick start

Use Node 24 and the pnpm version in `package.json`:

```bash
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:flow
pnpm build
```

Set `DATABASE_URL` in `.env.local` to a Postgres connection string, then run:

```bash
pnpm db:migrate
pnpm test:db
pnpm dev
```

The migrations are tracked with checksums and run outside request handling. Use a separate database for development and testing. Never commit connection strings, session keys or database contents.

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
| `db/`, `drizzle/`                | Postgres session adapter and migrations; retained D1 migration history                    |
| `public/campus.json`             | OpenStreetMap snapshot, routing network and sourced landmarks    |
| `public/assets/`                 | Logo, hardware photo/video, project report and presentation      |
| `public/vendor/`                 | Vendored Leaflet files                                           |
| `design/`                        | Brand source, design tokens and interface specification          |
| `scripts/`, `worker/`, `vendor/` | Checks and retained Worker runtime reference     |
| `components/`, `hooks/`, `lib/`  | Retained starter primitives and optional integration helpers     |
| `.openai/hosting.json`           | Current Sites/D1 hosting declaration; no credentials             |

## Developer and agent documentation

- [Project context and current status](docs/CONTEXT.md)
- [Architecture and persistence](docs/ARCHITECTURE.md)
- [API contract](docs/API.md)
- [TTN webhook setup and testing](docs/TTN_WEBHOOK.md)
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
