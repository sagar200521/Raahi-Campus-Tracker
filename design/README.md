# Raahi design system

## Brand

- Name: **Raahi**.
- Tagline: **Your campus. Connected.**
- Mark: route-shaped R with a location dot, shown on a rounded mint field.
- Source: `raahi-logo.svg`; deployed favicon/mark: `public/assets/raahi-icon.svg`.
- Machine-readable reference: `tokens.json`.

## Color and typography

| Token        | Value     | Use                                     |
| ------------ | --------- | --------------------------------------- |
| Background   | `#0B1220` | Midnight-navy workspace                 |
| Panel        | `#111E2E` | Cards and dialogs                       |
| Border       | `#243449` | Separators and card outlines            |
| Primary text | `#EAF2FA` | Headings and important values           |
| Muted        | `#8B9EB5` | Supporting labels                       |
| Mint         | `#72E3BD` | Primary actions, availability and brand |
| Amber        | `#FFC185` | Overspeed and stale/attention states    |
| Red          | `#FF9CA6` | Possible collisions and demo SOS        |
| Violet       | `#A7AFFF` | Assigned/ongoing trips and destinations |

Manrope is the heading family and DM Sans the body family, with sans-serif fallbacks. The current CSS loads fonts remotely; consider self-hosting properly licensed font files in a later deployment pass.

The source of truth for implemented styles is `app/globals.css`. Keep design tokens synchronized with code after changes; `tokens.json` is a reference, not an imported runtime theme.

## Role-specific hierarchy

**Student:** map and destination selection, request action, nearby rickshaws, current ride, saved places and history. Availability and request status must be visible before a user acts.

**Driver:** incoming pickup and current trip first. Use large, distinct actions for acceptance, arrival, start and completion. Vehicle availability cannot change during an active trip.

**Admin:** fleet health, map, incident inbox, trip records and device freshness. Incident priority must use text/icons as well as color.

## Responsive behavior

Desktop uses a persistent 244px sidebar and a map/content plus contextual panel. The main content padding is 34px and card radius is 11px. Tablet layouts collapse columns. At 700px, navigation becomes horizontal, booking controls stack and primary actions are at least 46px tall.

Never hide the only route to Demo Controls on mobile. Preserve readable state labels and map attribution at narrow widths. Dialogs support Escape and keyboard focus containment.

## Geographic design

The campus map must remain geographic. `public/campus.json` is sourced OpenStreetMap data, not artwork. Route overlays may only display actual graph output. Building-centre pins and uncertain gate access must not be presented as verified pickup entrances or guaranteed driveable routes.

The map has built-in light/dark styling and does not require an online tile provider. Do not reintroduce a blocked third-party tile service just to change its appearance.

## Assets and deliverables

Original prototype evidence lives under `public/assets/`: hardware photo, acceleration demonstration video, report and presentation. This export includes an editable SVG logo and design references; it does not include a Figma source file because one was not created for this implementation.
