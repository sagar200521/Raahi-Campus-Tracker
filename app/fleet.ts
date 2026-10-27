export const bounds = {
  south: 29.859,
  north: 29.874,
  west: 77.888,
  east: 77.905,
};
export function inside(p: any) {
  return (
    p &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    p.lat >= bounds.south &&
    p.lat <= bounds.north &&
    p.lng >= bounds.west &&
    p.lng <= bounds.east
  );
}
export function initialState() {
  const now = Date.now();
  return {
    vehicles: [
      {
        id: "ER-01",
        driver: "Demo driver 01",
        lat: 29.86519,
        lng: 77.89459,
        speed: 0,
        battery: 86,
        online: true,
        seats: 4,
        updated: now,
      },
      {
        id: "ER-02",
        driver: "Demo driver 02",
        lat: 29.86735,
        lng: 77.8957,
        speed: 0,
        battery: 72,
        online: true,
        seats: 4,
        updated: now,
      },
      {
        id: "ER-03",
        driver: "Demo driver 03",
        lat: 29.86652,
        lng: 77.89973,
        speed: 0,
        battery: 91,
        online: true,
        seats: 4,
        updated: now,
      },
      {
        id: "ER-04",
        driver: "Demo driver 04",
        lat: 29.86482,
        lng: 77.8939,
        speed: 0,
        battery: 64,
        online: false,
        seats: 4,
        updated: now,
      },
    ],
    rides: [],
    alerts: [],
  };
}
export const activeStatuses = [
  "accepted",
  "heading_to_pickup",
  "arrived",
  "in_progress",
];
export function transition(s: any, b: any) {
  const now = Date.now(),
    v = s.vehicles.find((x: any) => x.id === b.vehicle),
    ride = s.rides.find((x: any) => x.id === b.id);
  const fail = (m: string) => {
    throw new Error(m);
  };
  switch (b.action) {
    case "request": {
      if (!/^[\w-]{8,80}$/.test(b.id || "")) fail("Invalid request identifier");
      if (s.rides.some((r: any) => r.id === b.id)) return s;
      if (!inside(b.pickup) || !inside(b.destination))
        fail("Choose pickup and destination within the campus map area");
      if (
        Math.abs(b.pickup.lat - b.destination.lat) +
          Math.abs(b.pickup.lng - b.destination.lng) <
        0.0001
      )
        fail("Choose different pickup and destination points");
      if (!Number.isInteger(b.people) || b.people < 1 || b.people > 4)
        fail("Choose between 1 and 4 passengers");
      if (!v || !v.online || now - v.updated > 300000 || v.seats < b.people)
        fail("This vehicle is unavailable or its telemetry is stale");
      if (
        s.rides.some(
          (r: any) => r.vehicle === v.id && activeStatuses.includes(r.status),
        )
      )
        fail("This driver already has a trip");
      if (typeof b.student !== "string" || !/^[\w-]{8,80}$/.test(b.student))
        fail("Invalid student demo identity");
      if (
        s.rides.some(
          (r: any) =>
            r.student === b.student &&
            ["pending", ...activeStatuses].includes(r.status),
        )
      )
        fail("You already have an active request. Complete or cancel it first");
      if (s.rides.length >= 100)
        fail(
          "This demo session has reached its ride limit. Start a new session",
        );
      const point = (p: any) => ({
        lat: p.lat,
        lng: p.lng,
        name: String(p.name || "Map point").slice(0, 80),
      });
      s.rides.push({
        id: b.id,
        student: b.student,
        vehicle: v.id,
        pickup: point(b.pickup),
        destination: point(b.destination),
        people: b.people,
        status: "pending",
        created: now,
        updated: now,
        history: [{ status: "pending", at: now }],
      });
      break;
    }
    case "trip": {
      if (!ride) fail("Ride not found");
      const next = b.status;
      if (next === "cancelled") {
        if (
          ride.student !== b.student ||
          !["pending", "accepted", "heading_to_pickup", "arrived"].includes(
            ride.status,
          )
        )
          fail("This ride can no longer be cancelled");
        if (!String(b.note || "").trim())
          fail("Please provide a cancellation reason");
        ride.note = String(b.note).slice(0, 200);
      } else {
        if (ride.vehicle !== b.vehicle)
          fail("Vehicle does not match this request");
        const allowed: any = {
          pending: ["accepted", "declined"],
          accepted: ["heading_to_pickup"],
          heading_to_pickup: ["arrived"],
          arrived: ["in_progress"],
          in_progress: ["completed"],
        };
        if (!allowed[ride.status]?.includes(next))
          fail("This ride has already changed. Refresh and try again");
        if (next === "accepted") {
          if (!v?.online) fail("Go online before accepting");
          if (
            s.rides.some(
              (r: any) =>
                r.id !== ride.id &&
                r.vehicle === b.vehicle &&
                activeStatuses.includes(r.status),
            )
          )
            fail("Finish your current ride first");
          if (ride.people > v.seats) fail("Not enough seats");
          // Other pending requests stay pending until accepted or declined.
        }
        if (
          v &&
          ["heading_to_pickup", "arrived", "in_progress", "completed"].includes(
            next,
          )
        ) {
          const p = next === "completed" ? ride.destination : ride.pickup;
          if (["arrived", "completed"].includes(next)) {
            v.lat = p.lat;
            v.lng = p.lng;
          }
          v.updated = now;
          v.speed = 0;
        }
      }
      ride.status = next;
      ride.updated = now;
      ride.history.push({ status: next, at: now });
      break;
    }
    case "availability":
      if (!v) fail("Vehicle not found");
      if (
        s.rides.some(
          (r: any) => r.vehicle === v.id && activeStatuses.includes(r.status),
        )
      )
        fail("Complete your current ride before changing availability");
      if (!Number.isInteger(b.seats) || b.seats < 1 || b.seats > 4)
        fail("Seats must be 1 to 4");
      v.online = !!b.online;
      v.seats = b.seats;
      v.updated = now;
      break;
    case "telemetry": {
      if (!v) fail("Vehicle not found");
      if (!Number.isFinite(b.speed) || b.speed < 0 || b.speed > 100)
        fail("Speed must be between 0 and 100 km/h");
      v.speed = b.speed;
      v.updated = now;
      if (inside(b.position)) {
        v.lat = b.position.lat;
        v.lng = b.position.lng;
      }
      if (
        b.speed > 25 &&
        !s.alerts.some(
          (a: any) =>
            a.vehicle === v.id &&
            a.type === "overspeed" &&
            a.status !== "resolved",
        )
      )
        s.alerts.push({
          id: crypto.randomUUID(),
          vehicle: v.id,
          type: "overspeed",
          speed: b.speed,
          lat: v.lat,
          lng: v.lng,
          at: now,
          status: "open",
          history: [{ status: "open", at: now }],
        });
      break;
    }
    case "incident":
      if (!v || !["collision", "sos"].includes(b.type))
        fail("Invalid incident");
      s.alerts.push({
        id: crypto.randomUUID(),
        vehicle: v.id,
        type: b.type,
        speed: v.speed,
        lat: v.lat,
        lng: v.lng,
        at: now,
        status: "open",
        history: [{ status: "open", at: now }],
      });
      break;
    case "alert": {
      const a = s.alerts.find((a: any) => a.id === b.id);
      if (!a) fail("Incident not found");
      const flow: any = {
        open: "acknowledged",
        acknowledged: "under_review",
        under_review: "resolved",
      };
      if (flow[a.status] !== b.status) fail("Invalid incident transition");
      if (b.status === "resolved" && !String(b.note || "").trim())
        fail("A resolution note is required");
      a.status = b.status;
      a.note = String(b.note || "").slice(0, 500);
      a.history.push({ status: b.status, at: now, note: a.note });
      break;
    }
    default:
      fail("Unknown action");
  }
  s.alerts = s.alerts.slice(-100);
  return s;
}
