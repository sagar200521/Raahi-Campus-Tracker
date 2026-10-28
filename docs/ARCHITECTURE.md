# Architecture

## Request path

The React client calls two same-origin App Router endpoints. They use a server-only Postgres adapter. Next.js builds the Vercel runtime; the original Worker files remain as historical reference.

| Module                 | Responsibility                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `dashboard.tsx`        | UI role/tab state, booking fields, polling, action submission and dialogs                |
| `campus-map.tsx`       | Leaflet map, vector geometry, labels, vehicle overlays, selected stops and route display |
| `routing.ts`           | Road graph, nearest road-node matching and Dijkstra route calculation                    |
| `fleet.ts`             | Validated actions and state transitions, independent of the database                     |
| `api/session/route.ts` | Random session key generation, SHA-256 key hash and initial session insert               |
| `api/state/route.ts`   | Session lookup, state reads, validation, compare-and-swap updates                        |

## Postgres persistence

`demo_sessions` contains `id`, `state`, `version`, and `expires`.

- `id`: SHA-256 hash of a random bearer session key.
- `state`: JSON containing vehicles, rides and incidents.
- `version`: monotonic optimistic concurrency counter.
- `expires`: server-side expiry timestamp.

Writes read the current row, run the state reducer and update with `WHERE id = ? AND version = ?`. A failed compare-and-swap is retried, up to four attempts. The session and migration tables have row-level security enabled and are inaccessible to InsForge anonymous and authenticated API roles. This prevents simultaneous updates from silently replacing each other. The state reducer prevents multiple active trips for one vehicle and multiple active requests for one demo student identity.

The bounded demo stores at most 100 rides and the most recent 100 incidents per session. This single-JSON-row model is suitable for a small demonstration. Production should normalize entities and use appropriate transactional assignment constraints, event retention and indexes.

## Trip state machine

Normal flow:

```text
pending → accepted → heading_to_pickup → arrived → in_progress → completed
```

A pending request may be declined by its selected demo vehicle. A demo student may cancel its own pending, accepted, heading-to-pickup or arrived ride with a reason. Cancellation is blocked after a ride starts.

The browser's demo student identifier is not a verified identity. Server-side comparisons provide workflow consistency only; they are not production authorization.

## Incidents

```text
open → acknowledged → under_review → resolved
```

Overspeed means strictly more than 25 km/h. An unresolved overspeed incident is deduplicated per vehicle. Collision and SOS demo events can be added independently. A resolution note is required. Server timestamps and status history are retained.

There is no SMS, email, campus security integration, validated collision classifier or autonomous emergency response.

## Map and routing

`public/campus.json` is an OpenStreetMap snapshot downloaded on 24 October 2026 with geographic features, a vehicle-road network, campus bounds and ten landmark references. It is not a fabricated drawing.

The map is self-contained: Leaflet draws the saved geographic geometry and supports light/dark styling. No online tile service or API key is required. Coordinates for mapped buildings are their derived centres, not guaranteed road entrances.

Routes follow the local graph and one-way flags. Endpoint matching fails beyond 250 m from a mapped graph node. The route model does not verify live gate access, closures or e-rickshaw permissions. Estimated travel uses an assumed 12 km/h; building-to-road distance and pickup wait are excluded.

## Security boundary

A shared link grants control of an entire demo session. Role selection changes the interface, not access permissions. Postgres stores only the key hash. Reads check expiry, writes validate action shape and size, and write endpoints reject a mismatched Origin when present.

Before real deployment, add verified user identity, server-side membership and roles, device authentication, rate limits, data retention controls and an explicit dispatch integration.

## TTN device telemetry

The authenticated TTN webhook stores explicitly selected uplink fields in Postgres with atomic delivery deduplication. Real and simulated records are separate; last-known periodic GPS fixes are retained independently of the most recent uplink. Event snapshots do not move the marker. The dashboard shows these readings separately from simulated fleet vehicles and incidents.

The owner chose to allow any valid shared-demo session to read the configured real device. Since sessions can be created by anyone, this is public demo access, not identity-based authorization or device ownership. Do not use it for private location data. See `TTN_WEBHOOK.md` for setup, validation and limits.
