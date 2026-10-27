# Project context

## Purpose

Raahi coordinates campus e-rickshaw rides and demonstrates fleet safety monitoring for IIT Roorkee. It began as the Campus Fleet BTP project and was renamed Raahi with the tagline “Your campus. Connected.”

Project contributors named in the application: **Sagar Baruah and Ponting**.

The hardware evidence supplied for this version shows a **Heltec CubeCell AB02S**, **ADXL345** acceleration sensing and **128 × 64 SSD1306 OLED**, with acceleration acquisition and visualization. Do not infer that GPS-to-web telemetry, collision detection or dispatch is connected from the presence of those controls in the interface.

## User-approved decisions

- Dark midnight-navy and mint interface, amber overspeed warnings, red collision/SOS indicators.
- Separate Student, Driver and Admin/Security perspectives.
- Real IIT Roorkee geographic map rather than a schematic.
- Students request a rickshaw; drivers accept and progress trips; Admin inspects requests, vehicles and incidents.
- A speed strictly above 25 km/h creates an overspeed incident.
- Possible collisions are events for review, not proof of an accident.
- Keep the actual project photo, demonstration video, report and presentation.
- Existing Site is public.
- Publish the code in a public GitHub repository through GitHub CLI; make later changes before Vercel deployment.

## Current implementation

The exported application snapshot corresponds to Sites source commit `f1a3a07e4d40b780934b342873bb511612964922` (version 4). The public demo is https://campus-fleet-btp.justbat256.chatgpt.site/.

The application uses shared cloud-persisted demo sessions instead of browser-only fleet state. Session links connect devices to the same Postgres record; polling runs every four seconds. A session expires seven days after creation. Browser-local preferences hold the demo student identity, active session, role and saved places. Anyone who knows a session link can operate every demo role.

Requests, trip stages, cancellation, incident handling, map selection and export work. Production identities/role enforcement, live hardware telemetry, validated impact detection and real security communications remain outside this snapshot.

## Hosting handoff

The working tree migrates the runtime to Next.js and InsForge Postgres for Vercel. The original Cloudflare implementation remains in Git history. GitHub synchronization and deployment must be verified separately; see `VERCEL_MIGRATION.md`.

The source contains retained starter components and hosting helpers. They support the current build or are available primitives, but are not all active Raahi features. Do not advertise unused helpers as implemented integrations.
