# TTN uplink integration

Raahi can accept The Things Stack webhook uplinks for `vehicle-tracker-raahi` / `raahi-vt`, EU1, FPort 2, payload version 1. The TTN integration is separate from the simulated ER fleet and incident inbox; a heuristic impact or rollover flag is not a confirmed crash or a dispatch. No alerts are sent to external services. A dashboard demo-session link is a bearer capability, not an authenticated identity: anyone who can create or hold a demo session can read the allowed real device, as the project owner requested. Do not use this setup for private location data; proper accounts and device ownership enforcement are not implemented.

## Environment and migration

Configure these **server-side**, for Vercel Production and Preview (never `NEXT_PUBLIC_`):

- `DATABASE_URL`: existing Postgres connection with TLS verification.
- `TTN_WEBHOOK_SECRET`: a long random value shared only with TTN; use the same value for the Authorization header.
- `TTN_ALLOWED_APPLICATION_ID`: `vehicle-tracker-raahi`.
- `TTN_ALLOWED_DEVICE_IDS`: `raahi-vt` (comma-separated when multiple devices are allowed).

A placeholder example is in `.env.example` in the local workspace. Apply the versioned migration with `pnpm db:migrate` against the intended database before deploying. It adds `ttn_telemetry` and `ttn_device_latest`, with RLS enabled and InsForge public API roles denied. Migrations 0001 and 0002 are unchanged. Avoid committing environment files or credentials. Protect both the database URL and the webhook secret. If the webhook secret changes, update both Vercel and TTN and redeploy before using the new value.

Deploy the Next.js app on Vercel after configuring the variables; a Git push to the connected repository triggers a deployment. `GET /api/ttn/health` returns `{ "ready": true }` only if the required configuration and tables are available; it does not indicate that a real packet was received.

## TTN console

In the EU1 console, choose application `vehicle-tracker-raahi`, Integrations → Webhooks → Add webhook → Custom webhook:

- Webhook ID: choose a unique identifier, for example `raahi-dashboard`.
- Format: JSON.
- Base URL: `https://raahi-campus-demo.vercel.app`.
- Additional header: `Authorization` with value `Bearer ` followed by the `TTN_WEBHOOK_SECRET` value.
- Enable **Uplink message** and set its path to `/api/ttn/uplink`. Do not filter the envelope fields; the handler requires device/application IDs, `received_at`, `session_key_id`, `f_cnt`, `f_port`, and benefits from decoded payload and gateway metadata.
- Do not configure TTN's separate Basic Authentication option for this bearer header. Other event types may be disabled; authenticated non-uplink events are ignored.

See [TTN custom webhooks](https://www.thethingsindustries.com/docs/integrations/webhooks/creating-webhooks/) and [uplink fields](https://www.thethingsindustries.com/docs/api/reference/grpc/application_server/). The session key identifier is hashed for deduplication and is never logged or stored in the telemetry record. Gateway metadata is selected by lexicographically smallest gateway ID, then strongest RSSI and SNR; gateway location is never used as a vehicle location. The UI displays the last valid periodic fix separately, its received time and reported GPS age; received time is not GPS fix time, and queued event snapshots never update the marker. Locations outside the campus map bounds are shown as coordinates only.

## Synthetic tests

`tests/fixtures/ttn-uplink.json` is synthetic and explicitly marked `simulated: true`. On an environment configured with matching application/device allowlists and a webhook secret:

```bash
export TTN_WEBHOOK_SECRET='your-test-secret'
export RAAHI_BASE_URL='http://localhost:3000'
curl -sS -X POST "$RAAHI_BASE_URL/api/ttn/uplink" -H "Authorization: Bearer $TTN_WEBHOOK_SECRET" -H 'Content-Type: application/json' --data-binary @tests/fixtures/ttn-uplink.json
curl -sS "$RAAHI_BASE_URL/api/ttn/health"
```

PowerShell:

```powershell
$env:TTN_WEBHOOK_SECRET = 'your-test-secret'
$env:RAAHI_BASE_URL = 'http://localhost:3000'
$headers = @{ Authorization = "Bearer $env:TTN_WEBHOOK_SECRET" }
Invoke-RestMethod -Method Post -Uri "$env:RAAHI_BASE_URL/api/ttn/uplink" -Headers $headers -ContentType 'application/json' -InFile 'tests/fixtures/ttn-uplink.json'
Invoke-RestMethod -Uri "$env:RAAHI_BASE_URL/api/ttn/health"
```

The first new fixture delivery returns `{"ok":true,"status":"stored","device_id":"raahi-vt"}`; replaying the same tuple returns `duplicate`. A failed database transaction returns 503; invalid authentication returns 401. A unique `session_key_id` is needed for another synthetic test using the same counter. The Admin / Security dashboard has separate Real device and Simulated tests views. The read API `GET /api/vehicles/raahi-vt/telemetry?limit=50&simulated=true` requires `X-Raahi-Session` and returns at most 100 records. It returns real records by default.

Run `pnpm test:ttn` against a database with migrations applied; it creates unique, synthetic records and removes them on completion. A passing synthetic test does not verify a physical TTN POST. Confirm live delivery separately using TTN webhook delivery logs, stored real telemetry, and the dashboard without treating an impact flag as an accident.
