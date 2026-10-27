import assert from "node:assert/strict";
import { initialState, transition } from "../app/fleet.ts";
import { buildGraph, roadRoute } from "../app/routing.ts";
import fs from "node:fs";
const data = JSON.parse(
  fs.readFileSync(new URL("../public/campus.json", import.meta.url), "utf8"),
);
let s: any = initialState();
const base = {
  student: "student00001",
  vehicle: "ER-01",
  pickup: data.stops[0],
  destination: data.stops[2],
  people: 2,
};
s = transition(s, { ...base, action: "request", id: "request0001" });
assert.equal(s.rides[0].status, "pending");
s = transition(s, { ...base, action: "request", id: "request0001" });
assert.equal(s.rides.length, 1);
assert.throws(
  () => transition(s, { ...base, action: "request", id: "request0002" }),
  /active request/,
);
s = transition(s, {
  ...base,
  action: "request",
  student: "student00002",
  id: "request0002",
});
s = transition(s, {
  action: "trip",
  id: "request0001",
  vehicle: "ER-01",
  status: "accepted",
});
assert.throws(
  () =>
    transition(s, {
      action: "trip",
      id: "request0002",
      vehicle: "ER-01",
      status: "accepted",
    }),
  /current ride/,
);
assert.throws(
  () =>
    transition(s, {
      action: "trip",
      id: "request0001",
      vehicle: "ER-01",
      status: "completed",
    }),
  /already changed/,
);
for (const status of [
  "heading_to_pickup",
  "arrived",
  "in_progress",
  "completed",
])
  s = transition(s, {
    action: "trip",
    id: "request0001",
    vehicle: "ER-01",
    status,
  });
assert.equal(s.rides[0].status, "completed");
assert.equal(s.vehicles[0].lat, base.destination.lat);
s = transition(s, {
  action: "trip",
  id: "request0002",
  student: "student00002",
  status: "cancelled",
  note: "Plans changed",
});
assert.equal(s.rides[1].status, "cancelled");
assert.throws(
  () =>
    transition(s, {
      ...base,
      action: "request",
      id: "request0003",
      pickup: { lat: 0, lng: 0 },
    }),
  /campus/,
);
s = transition(s, { action: "telemetry", vehicle: "ER-01", speed: 25 });
assert.equal(s.alerts.length, 0);
s = transition(s, { action: "telemetry", vehicle: "ER-01", speed: 25.1 });
assert.equal(s.alerts.length, 1);
s = transition(s, { action: "telemetry", vehicle: "ER-01", speed: 30 });
assert.equal(s.alerts.length, 1);
const alert = s.alerts[0];
for (const status of ["acknowledged", "under_review"])
  s = transition(s, { action: "alert", id: alert.id, status });
assert.throws(
  () => transition(s, { action: "alert", id: alert.id, status: "resolved" }),
  /note/,
);
s = transition(s, {
  action: "alert",
  id: alert.id,
  status: "resolved",
  note: "Driver contacted; speed corrected",
});
s = transition(s, { action: "incident", vehicle: "ER-01", type: "collision" });
s = transition(s, { action: "incident", vehicle: "ER-01", type: "sos" });
assert.equal(s.alerts.length, 3);
s.vehicles[0].updated = Date.now() - 301000;
assert.throws(
  () => transition(s, { ...base, action: "request", id: "request0004" }),
  /stale/,
);
const graph = buildGraph(data);
let routes = 0;
for (const a of data.stops)
  for (const b of data.stops) {
    if (a.id !== b.id && roadRoute(graph, a, b)) routes++;
  }
assert.ok(routes > 60, `${routes} routes`);
console.log(
  `PASS: ride lifecycle, double assignment, duplicate requests, cancellation, campus validation, 25 km/h boundary, incident deduplication and resolution, stale telemetry; ${routes} mapped stop-to-stop routes.`,
);
