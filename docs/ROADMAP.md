# Next implementation priorities

## 1. Next user-requested product changes

The owner plans more changes after the GitHub push. Gather those requirements before expanding scope or migrating the hosting runtime.

## 2. Vercel runtime and persistence migration

Follow `VERCEL_MIGRATION.md`. Preserve behavior while adapting framework output and database access. Build preview and concurrency checks before production deployment.

## 3. Production identity and authorization

Add verified Student, Driver and Admin roles; driver/vehicle assignment; server-side membership checks; appropriate rate limits and audit events. Keep demo sessions isolated. Do not expose real fleet locations through unrestricted demo links.

## 4. Hardware ingestion

Define and validate a device packet contract (device ID, timestamp, location/fix quality, speed, acceleration/event fields and battery/connectivity when measured). Authenticate devices, reject stale/replayed packets, and link devices to vehicles. Real hardware must update the backend rather than driving the simulator.

## 5. Validated safety events

Calibrate and test the IMU in its actual vehicle mounting. Separate vibration, impact, tilt and possible rollover logic. Record confidence and raw context where appropriate, support human verification and only then integrate an approved security notification workflow.

## 6. Operational hardening

Normalize persistence beyond the bounded single-record demo model; add retention/deletion, monitoring, backup/recovery and error reporting. Verify route access and pickup entrances with the campus before presenting reliable navigation or pickup ETAs.
