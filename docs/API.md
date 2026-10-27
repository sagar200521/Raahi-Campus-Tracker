# Demo API

All endpoints are same-origin JSON APIs. Their contract currently lives in `app/api/` and `app/fleet.ts`. This API coordinates a **shared demo**, not real authenticated riders, drivers or security staff.

## Create session

`POST /api/session` creates an initial fleet and expiring session. No application credentials or environment tokens are sent by the client.

Response: `{ "key": "<random session capability>" }`.

Keep this key out of logs and source control. The client uses the URL fragment for sharing and sends the key in the `X-Raahi-Session` header on subsequent API calls. The database stores its SHA-256 hash, not the original key.

## Read state

`GET /api/state`, with `X-Raahi-Session`.

Response: `{ "state": { "vehicles": [], "rides": [], "alerts": [] }, "version": 0, "expires": 0 }`.

Missing, invalid or expired session keys return an error. Browser reads poll every four seconds. Responses use `Cache-Control: no-store`.

## Apply action

`POST /api/state`, JSON body and `X-Raahi-Session` header. Successful writes return the same envelope as a read.

| `action`        | Required fields                                               | Meaning                                                  |
| --------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| `request`       | `id`, `student`, `vehicle`, `pickup`, `destination`, `people` | Create a pending ride; repeated request ID is idempotent |
| `trip`          | `id`, `vehicle`, `status`                                     | Driver lifecycle transition                              |
| `trip` (cancel) | `id`, `student`, `status: "cancelled"`, `note`                | Cancel the matching demo student's ride before it starts |
| `availability`  | `vehicle`, `online`, `seats`                                  | Change availability; locked during an active trip        |
| `telemetry`     | `vehicle`, `speed`; optional `position`                       | Simulated speed sample and optional in-bounds position   |
| `incident`      | `vehicle`, `type: "collision"` or `"sos"`                     | Generate a demo incident                                 |
| `alert`         | `id`, `status`; `note` required for resolution                | Advance incident handling                                |

A point is `{ "lat": 29.0, "lng": 77.0, "name": "Campus stop" }`; use actual values within the configured campus bounds, not the illustrative coordinates in this shape example. The client obtains sourced stops from `public/campus.json`.

The reducer validates campus positions, different pickup/destination points, passenger count (1–4), vehicle freshness/availability/capacity, lifecycle transitions and cancellation/resolution reasons. Speed samples must be between 0 and 100 km/h. Request bodies are limited to 8 KiB.

## Errors and concurrency

Errors return `{ "error": "description" }`. The current implementation uses 400 for invalid action transitions, 401 for read-session failures, 403 for an invalid Origin, 409 after repeated optimistic write conflicts, 413 for oversized bodies and 503 for unavailable session creation. Mutation failures currently share the 400 handler for several conditions; do not depend on more specific error codes until that handler is refined.

This contract intentionally lacks production role authentication. Possession of the session key authorizes the demo workspace, including its Admin perspective.
