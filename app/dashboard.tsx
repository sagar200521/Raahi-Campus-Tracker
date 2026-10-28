"use client";
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Battery,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Flag,
  Heart,
  LayoutDashboard,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  Route,
  Search,
  Settings2,
  Shield,
  TriangleAlert,
  Truck,
  Users,
  Wifi,
  WifiOff,
  X,
  Play,
  Link as LinkIcon,
  RefreshCw,
  BookOpen,
  Plus,
} from "lucide-react";
import CampusMap from "./campus-map";
import TtnPanel, { useTtn } from "./ttn-panel";
import { buildGraph, distance, roadRoute, Point } from "./routing";
import { activeStatuses, inside } from "./fleet";
type Role = "admin" | "student" | "driver" | "project";
const labels: any = {
  pending: "Pending",
  accepted: "Accepted",
  heading_to_pickup: "Heading to pickup",
  arrived: "Driver arrived",
  in_progress: "In progress",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
  open: "Open",
  acknowledged: "Acknowledged",
  under_review: "Under review",
  resolved: "Resolved",
};
const fmt = (t: number) =>
  new Date(t).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
const age = (t: number) => {
  let n = Math.max(0, Math.floor((Date.now() - t) / 1000));
  return n < 60
    ? `${n}s ago`
    : n < 3600
      ? `${Math.floor(n / 60)}m ago`
      : `${Math.floor(n / 3600)}h ago`;
};
const uid = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
function Badge({ children, tone = "mint" }: any) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Panel({ title, sub, action, children, className = "" }: any) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Empty({ title, children, icon: Icon = Route }: any) {
  return (
    <div className="empty">
      <span>
        <Icon size={23} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Stat({ label, value, note, icon: Icon, tone = "" }: any) {
  return (
    <div className="stat">
      <div className="stat-label">
        {label}
        <Icon size={17} />
      </div>
      <div className={`stat-value ${tone}`}>{value}</div>
      <small>{note}</small>
    </div>
  );
}
export default function Dashboard() {
  const [role, setRole] = useState<Role>("student"),
    [tab, setTab] = useState("overview"),
    [data, setData] = useState<any>(null),
    [state, setState] = useState<any>(null),
    [key, setKey] = useState(""),
    [student, setStudent] = useState(""),
    [connecting, setConnecting] = useState(true),
    [error, setError] = useState(""),
    [sync, setSync] = useState(0),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(""),
    [modal, setModal] = useState(""),
    [selected, setSelected] = useState("ER-01"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [pickup, setPickup] = useState<Point | null>(null),
    [destination, setDestination] = useState<Point | null>(null),
    [people, setPeople] = useState(1),
    [pickMode, setPickMode] = useState("pickup"),
    [favorites, setFavorites] = useState<string[]>([]),
    [focus, setFocus] = useState<Point | null>(null),
    [join, setJoin] = useState(""),
    [speed, setSpeed] = useState(28),
    [note, setNote] = useState(""),
    [incident, setIncident] = useState<any>(null),
    [tilesInfo, setTilesInfo] = useState(false),
    [rideTarget, setRideTarget] = useState<any>(null);
  const creating = useRef(false),
    actionRef = useRef(false),
    versionRef = useRef(-1);
  const graph = useMemo(() => (data ? buildGraph(data) : null), [data]);
  const ttn = useTtn(key, role === "admin");
  function notify(s: string) {
    setToast(s);
    setTimeout(() => setToast(""), 4200);
  }
  useEffect(() => {
    fetch("/campus.json")
      .then((r) => {
        if (!r.ok) throw Error("Map data unavailable");
        return r.json();
      })
      .then((d: any) => {
        setData(d);
        setPickup(d.stops[0]);
        setDestination(d.stops[2]);
      })
      .catch((e) => setError(e.message));
    const id = localStorage.getItem("raahi-student") || uid();
    localStorage.setItem("raahi-student", id);
    setStudent(id);
    try {
      setFavorites(JSON.parse(localStorage.getItem("raahi-favorites") || "[]"));
    } catch {}
    const fragment = new URLSearchParams(location.hash.slice(1)),
      incoming = fragment.get("session");
    if (incoming && /^[\w-]{64,100}$/.test(incoming)) {
      setKey(incoming);
      localStorage.setItem("raahi-session", incoming);
    } else {
      const stored = localStorage.getItem("raahi-session");
      if (stored) setKey(stored);
      else createSession();
    }
    const r = fragment.get("role") || localStorage.getItem("raahi-role");
    if (["admin", "student", "driver"].includes(r || "")) setRole(r as Role);
    if (/^ER-0[1-4]$/.test(fragment.get("vehicle") || ""))
      setSelected(fragment.get("vehicle")!);
  }, []);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement;
    const dialog = document.querySelector(".modal") as HTMLElement;
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a[href],input,select,textarea",
        ) || [],
      );
    focusable()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal("");
      if (e.key === "Tab") {
        const f = focusable(),
          first = f[0],
          last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [modal]);
  async function createSession() {
    if (creating.current) return;
    creating.current = true;
    setConnecting(true);
    setError("");
    try {
      const r = await fetch("/api/session", { method: "POST" }),
        j: any = await r.json();
      if (!r.ok) throw Error(j.error);
      setKey(j.key);
      localStorage.setItem("raahi-session", j.key);
      history.replaceState(null, "", location.pathname);
      notify("Shared demo workspace created");
    } catch (e: any) {
      setError(e.message);
      setConnecting(false);
    } finally {
      creating.current = false;
    }
  }
  useEffect(() => {
    if (!key) return;
    versionRef.current = -1;
    let live = true;
    async function poll() {
      try {
        const r = await fetch("/api/state", {
            headers: { "X-Raahi-Session": key },
            cache: "no-store",
          }),
          j: any = await r.json();
        if (!r.ok) throw Error(j.error);
        if (live && j.version >= versionRef.current) {
          versionRef.current = j.version;
          setState(j.state);
          setSync(Date.now());
          setError("");
          setConnecting(false);
        }
      } catch (e: any) {
        if (live) {
          setError(e.message);
          setConnecting(false);
        }
      }
    }
    poll();
    const t = setInterval(poll, 4000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [key]);
  async function act(body: any) {
    if (actionRef.current) return false;
    actionRef.current = true;
    setBusy(true);
    try {
      const r = await fetch("/api/state", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Raahi-Session": key,
          },
          body: JSON.stringify(body),
        }),
        j: any = await r.json();
      if (!r.ok) throw Error(j.error);
      versionRef.current = j.version;
      setState(j.state);
      setSync(Date.now());
      setError("");
      return true;
    } catch (e: any) {
      notify(e.message);
      return false;
    } finally {
      actionRef.current = false;
      setBusy(false);
    }
  }
  const rides = state?.rides || [],
    alerts = state?.alerts || [];
  const vehicles = (state?.vehicles || []).map((v: any) => ({
    ...v,
    busy: rides.some(
      (r: any) => r.vehicle === v.id && activeStatuses.includes(r.status),
    ),
    stale: Date.now() - v.updated > 300000,
  }));
  const currentVehicle =
    vehicles.find((v: any) => v.id === selected) || vehicles[0];
  const mine = rides.filter((r: any) => r.student === student),
    myActive = mine.find((r: any) =>
      ["pending", ...activeStatuses].includes(r.status),
    ),
    driverActive = rides.find(
      (r: any) => r.vehicle === selected && activeStatuses.includes(r.status),
    );
  const available = vehicles.filter(
    (v: any) => v.online && !v.stale && !v.busy && v.seats >= people,
  );
  const openAlerts = alerts.filter((a: any) => a.status !== "resolved");
  const route = useMemo(
    () =>
      pickup && destination ? roadRoute(graph, pickup, destination) : null,
    [graph, pickup, destination],
  );
  const activeRoute = useMemo(
    () =>
      myActive ? roadRoute(graph, myActive.pickup, myActive.destination) : null,
    [graph, myActive],
  );
  const driverRoute = useMemo(
    () =>
      driverActive && currentVehicle
        ? roadRoute(
            graph,
            driverActive.status === "in_progress"
              ? driverActive.pickup
              : currentVehicle,
            driverActive.status === "in_progress"
              ? driverActive.destination
              : driverActive.pickup,
          )
        : null,
    [graph, driverActive, currentVehicle?.lat, currentVehicle?.lng],
  );
  function changeRole(r: Role) {
    localStorage.setItem("raahi-role", r);
    setRole(r);
    setTab("overview");
    setQuery("");
    setFilter("all");
    setRideTarget(null);
  }
  function choosePoint(p: Point) {
    if (!inside(p)) {
      notify("Choose a point inside the IIT Roorkee map area");
      return;
    }
    if (pickMode === "pickup") {
      setPickup(p);
      setPickMode("destination");
    } else {
      setDestination(p);
      setPickMode("pickup");
    }
  }
  async function geolocate() {
    if (!navigator.geolocation) {
      notify("Location is not supported in this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const point = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          name: "My location",
        };
        if (!inside(point)) {
          notify(
            "Your location is outside the campus map area. Choose a campus stop instead.",
          );
          return;
        }
        setPickup(point);
        setFocus(point);
        notify("Pickup set to your location");
      },
      () =>
        notify(
          "Location unavailable or permission denied. Choose a stop on the map.",
        ),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }
  async function copyLink(targetRole = role) {
    const link =
      location.origin +
      location.pathname +
      "#" +
      new URLSearchParams({
        session: key,
        role: targetRole,
        vehicle: selected,
      }).toString();
    try {
      await navigator.clipboard.writeText(link);
      notify("Shared demo link copied");
    } catch {
      setJoin(link);
      notify("Copy the session link from the text field");
    }
  }
  async function requestRide() {
    if (!pickup || !destination) return;
    if (
      await act({
        action: "request",
        id: uid(),
        student,
        vehicle: selected,
        pickup,
        destination,
        people,
      })
    ) {
      setTab("active");
      notify("Pickup requested. Waiting for the driver to accept.");
    }
  }
  async function trip(r: any, status: string) {
    if (status === "cancelled") {
      setRideTarget(r);
      setNote("");
      setModal("cancel");
      return;
    }
    if (
      await act({
        action: "trip",
        id: r.id,
        vehicle: selected,
        student,
        status,
      })
    )
      notify(`Ride ${labels[status].toLowerCase()}`);
  }
  function exportData() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              project: "Raahi",
              source: "shared demonstration",
              exported: new Date().toISOString(),
              ...state,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "raahi-activity.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function saveFavorite(id: string) {
    const next = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    setFavorites(next);
    localStorage.setItem("raahi-favorites", JSON.stringify(next));
  }
  const displayVehicles = vehicles.filter(
    (v: any) =>
      (v.id + " " + v.driver).toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "available" && v.online && !v.busy && !v.stale) ||
        (filter === "occupied" && v.busy) ||
        (filter === "offline" && !v.online) ||
        (filter === "stale" && v.stale) ||
        (filter === "alerts" &&
          openAlerts.some((a: any) => a.vehicle === v.id))),
  );
  function vehicleStatus(v: any) {
    return v.stale
      ? "Stale telemetry"
      : !v.online
        ? "Offline"
        : v.busy
          ? "On a trip"
          : "Available";
  }
  function mapPanel({ studentMap = false, driverMap = false }: any = {}) {
    return (
      <Panel
        title={
          studentMap
            ? "Where are you heading?"
            : driverMap
              ? "Your campus route"
              : "Campus fleet map"
        }
        sub="IIT Roorkee · OpenStreetMap geography"
        action={
          <button
            className="text-button"
            onClick={() => setTilesInfo(!tilesInfo)}
          >
            <LayersIcon /> Map details
          </button>
        }
        className="map-panel"
      >
        {data ? (
          <CampusMap
            data={data}
            vehicles={role === "admin" ? displayVehicles : vehicles}
            ttnGps={role === "admin" ? ttn.live?.last_known_gps : null}
            selected={
              studentMap && tab === "active" && myActive
                ? myActive.vehicle
                : selected
            }
            onSelect={setSelected}
            onPoint={studentMap && tab !== "active" ? choosePoint : undefined}
            pickup={
              driverMap
                ? driverActive?.pickup
                : studentMap
                  ? tab === "active" && myActive
                    ? myActive.pickup
                    : pickup
                  : null
            }
            destination={
              driverMap
                ? driverActive?.destination
                : studentMap
                  ? tab === "active" && myActive
                    ? myActive.destination
                    : destination
                  : null
            }
            path={
              driverMap
                ? driverRoute?.path
                : studentMap
                  ? tab === "active" && myActive
                    ? activeRoute?.path
                    : route?.path
                  : null
            }
            focus={focus}
          />
        ) : (
          <div className="loading-map">Loading campus geography…</div>
        )}
        <div className="map-legend">
          <span>
            <i className="mint" />
            Available
          </span>
          <span>
            <i className="violet" />
            On a trip
          </span>
          <span>
            <i className="gray" />
            Offline / stale
          </span>
          <span className="legend-note">Demo vehicles · real geography{role === "admin" && ttn.live?.last_known_gps ? " · TTN last-known fix" : ""}</span>
        </div>
        {tilesInfo && (
          <div className="map-info">
            Real campus roads and landmarks from an OpenStreetMap snapshot, 24
            Oct 2026. Building points are mapped centres, not guaranteed pickup
            entrances. Route previews follow mapped vehicle roads and one-way
            tags; gate access and road conditions are not verified.{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              © OpenStreetMap contributors · ODbL ↗
            </a>
          </div>
        )}
      </Panel>
    );
  }
  function vehicleDetail() {
    if (!currentVehicle) return null;
    const v = currentVehicle;
    return (
      <Panel
        title="Vehicle details"
        sub={`${v.id} · simulated telemetry`}
        action={
          <Badge tone={v.stale ? "amber" : v.online ? "mint" : "gray"}>
            {vehicleStatus(v)}
          </Badge>
        }
      >
        <div className="vehicle-details">
          <div className="vehicle-detail-head">
            <span className="vehicle-art">
              <Truck size={34} />
            </span>
            <div>
              <h3>{v.id}</h3>
              <p>{v.driver}</p>
            </div>
            <b>
              {v.speed}
              <small>km/h</small>
            </b>
          </div>
          <div className="detail-grid">
            <span>
              <Battery size={15} /> Battery <b>{v.battery}%</b>
            </span>
            <span>
              <Users size={15} /> Seats <b>{v.seats}</b>
            </span>
            <span>
              <Wifi size={15} /> Last sample <b>{age(v.updated)}</b>
            </span>
            <span>
              <Shield size={15} /> Speed limit <b>25 km/h</b>
            </span>
          </div>
          <div className="coords">
            <MapPin size={13} />
            {v.lat.toFixed(5)}, {v.lng.toFixed(5)}
            <button onClick={() => setFocus({ ...v })}>Locate ↗</button>
          </div>
          {v.stale && (
            <p className="inline-warning">
              Telemetry is over 5 minutes old. Send a fresh demo sample before
              booking this vehicle.
            </p>
          )}
        </div>
      </Panel>
    );
  }
  function rideCard(r: any, driver = false) {
    const flow: any = {
      accepted: ["heading_to_pickup", "Head to pickup"],
      heading_to_pickup: ["arrived", "Mark arrived"],
      arrived: ["in_progress", "Start ride"],
      in_progress: ["completed", "Complete ride"],
    };
    return (
      <article className="ride-card" key={r.id}>
        <div className="ride-top">
          <span className="tiny">RIDE #{r.id.slice(0, 6).toUpperCase()}</span>
          <Badge
            tone={
              r.status === "completed"
                ? "mint"
                : ["declined", "cancelled"].includes(r.status)
                  ? "gray"
                  : "violet"
            }
          >
            {labels[r.status]}
          </Badge>
        </div>
        <div className="journey">
          <div>
            <i className="pickup-dot" />
            <span>
              <small>PICKUP</small>
              <strong>{r.pickup.name}</strong>
            </span>
          </div>
          <div>
            <i className="drop-dot" />
            <span>
              <small>DESTINATION</small>
              <strong>{r.destination.name}</strong>
            </span>
          </div>
        </div>
        <div className="ride-meta">
          <span>
            <Truck size={13} />
            {r.vehicle}
          </span>
          <span>
            <Users size={13} />
            {r.people} passenger{r.people > 1 ? "s" : ""}
          </span>
          <span>
            <Clock size={13} />
            {fmt(r.created)}
          </span>
        </div>
        {r.note && <p className="ride-note">Note: {r.note}</p>}
        {!driver && activeStatuses.includes(r.status) && (
          <div className="driver-assigned">
            <CheckCircle2 size={17} />
            <div>
              <b>{vehicles.find((v: any) => v.id === r.vehicle)?.driver}</b>
              <small>
                {r.status === "arrived"
                  ? "Your driver is waiting at the pickup."
                  : r.status === "in_progress"
                    ? "Your campus ride is underway."
                    : "Your driver has accepted the pickup."}
              </small>
            </div>
          </div>
        )}
        <div className="ride-actions">
          {driver && r.status === "pending" ? (
            <>
              <button
                className="button"
                disabled={busy || !!driverActive || !currentVehicle?.online}
                onClick={() => trip(r, "accepted")}
              >
                Accept pickup <Check size={15} />
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => trip(r, "declined")}
              >
                Decline
              </button>
            </>
          ) : driver && flow[r.status] ? (
            <>
              <button
                className="button"
                disabled={busy}
                onClick={() => trip(r, flow[r.status][0])}
              >
                {flow[r.status][1]} <ArrowRight size={16} />
              </button>
              <a
                className="button secondary"
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps/dir/?api=1&destination=${(r.status === "in_progress" ? r.destination : r.pickup).lat},${(r.status === "in_progress" ? r.destination : r.pickup).lng}&travelmode=driving`}
              >
                <Navigation size={14} />
                Navigate
              </a>
            </>
          ) : null}
          {!driver &&
            ["pending", "accepted", "heading_to_pickup", "arrived"].includes(
              r.status,
            ) && (
              <button
                className="text-button danger-text"
                onClick={() => trip(r, "cancelled")}
              >
                Cancel request
              </button>
            )}
          <button
            className="text-button"
            onClick={() => {
              setRideTarget(r);
              setModal("timeline");
            }}
          >
            Timeline <ChevronRight size={14} />
          </button>
        </div>
      </article>
    );
  }
  function tripTable() {
    const list = rides
      .filter((r: any) => filter === "all" || r.status === filter)
      .filter((r: any) =>
        (r.vehicle + " " + r.pickup.name + " " + r.destination.name)
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
      .slice()
      .reverse();
    return (
      <Panel
        title="Requests & trips"
        sub={`${list.length} records in this shared demo`}
        action={
          <button className="button secondary compact" onClick={exportData}>
            <ArrowDownToLine size={14} />
            Export
          </button>
        }
      >
        <div className="table-toolbar">
          <div className="search">
            <Search size={15} />
            <input
              aria-label="Search rides"
              placeholder="Search vehicle or campus stop…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter trips"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            {Object.entries(labels)
              .filter(([k]) =>
                [
                  "pending",
                  ...activeStatuses,
                  "completed",
                  "cancelled",
                  "declined",
                ].includes(k),
              )
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v as string}
                </option>
              ))}
          </select>
        </div>
        {list.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>TRIP</th>
                  <th>PICKUP → DESTINATION</th>
                  <th>VEHICLE</th>
                  <th>PASSENGERS</th>
                  <th>STATUS</th>
                  <th>UPDATED</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r: any) => (
                  <tr
                    key={r.id}
                    onClick={() => {
                      setRideTarget(r);
                      setModal("timeline");
                    }}
                  >
                    <td>#{r.id.slice(0, 6)}</td>
                    <td>
                      {r.pickup.name}
                      <small>{r.destination.name}</small>
                    </td>
                    <td>{r.vehicle}</td>
                    <td>{r.people}</td>
                    <td>
                      <Badge tone={r.status === "completed" ? "mint" : "gray"}>
                        {labels[r.status]}
                      </Badge>
                    </td>
                    <td>{age(r.updated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No matching trips">
            Requests and trip updates will appear here as students and drivers
            use this session.
          </Empty>
        )}
      </Panel>
    );
  }
  function incidentList(full = false) {
    const list = alerts
      .filter((a: any) =>
        full
          ? filter === "all" || a.status === filter
          : a.status !== "resolved",
      )
      .slice()
      .reverse();
    return (
      <Panel
        title={full ? "Incident centre" : "Security inbox"}
        sub={
          full
            ? "Track each event from detection to resolution"
            : "Overspeed, possible collisions & driver SOS"
        }
        action={
          <Badge tone={openAlerts.length ? "amber" : "mint"}>
            {openAlerts.length} UNRESOLVED
          </Badge>
        }
      >
        {full && (
          <div className="table-toolbar">
            <select
              aria-label="Filter incidents"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All incidents</option>
              {["open", "acknowledged", "under_review", "resolved"].map((x) => (
                <option key={x} value={x}>
                  {labels[x]}
                </option>
              ))}
            </select>
            <button className="text-button" onClick={exportData}>
              <ArrowDownToLine size={14} />
              Export incidents
            </button>
          </div>
        )}
        <div className={full ? "incident-grid" : "incident-list"}>
          {list.length ? (
            list.map((a: any) => (
              <article
                key={a.id}
                className={`incident ${a.type === "overspeed" ? "warning" : "critical"}`}
              >
                <div className="incident-title">
                  <span>
                    <TriangleAlert size={17} />
                    {a.type === "overspeed"
                      ? "Overspeed"
                      : a.type === "collision"
                        ? "Possible collision"
                        : "Driver SOS"}
                  </span>
                  <Badge
                    tone={
                      a.status === "resolved"
                        ? "mint"
                        : a.type === "overspeed"
                          ? "amber"
                          : "red"
                    }
                  >
                    {labels[a.status]}
                  </Badge>
                </div>
                <p>
                  {a.vehicle} ·{" "}
                  {a.type === "overspeed"
                    ? `${a.speed} km/h · limit 25 km/h`
                    : a.type === "collision"
                      ? "Simulated impact · verify with driver"
                      : "Demo emergency request"}
                </p>
                <div className="incident-bottom">
                  <span>{fmt(a.at)} IST</span>
                  <button
                    onClick={() => {
                      setIncident(a);
                      setNote(a.note || "");
                      setModal("incident");
                    }}
                  >
                    View incident <ArrowUpRight size={13} />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <Empty title="All clear">
              No incidents in this view. Use Demo Controls to test the security
              workflow.
            </Empty>
          )}
        </div>
        {!full && (
          <button
            className="panel-link"
            onClick={() => {
              setTab("incidents");
              setFilter("all");
            }}
          >
            Open incident centre <ArrowRight size={15} />
          </button>
        )}
      </Panel>
    );
  }
  const nav =
    role === "admin"
      ? [
          ["overview", "Overview", LayoutDashboard],
          ["fleet", "Fleet & devices", Truck],
          ["trips", "Requests & trips", Route],
          ["incidents", "Incident centre", Shield],
        ]
      : role === "student"
        ? [
            ["overview", "Book a ride", MapPin],
            ["active", "Your current ride", Navigation],
            ["history", "Ride history", Clock],
            ["saved", "Saved places", Heart],
          ]
        : role === "driver"
          ? [
              ["overview", "Driver workboard", LayoutDashboard],
              ["current", "Current trip", Navigation],
              ["history", "Completed rides", CheckCircle2],
            ]
          : [];
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Raahi home">
          <img src="/assets/raahi-icon.svg" alt="" />
          <span>
            raahi<b>.</b>
          </span>
        </a>
        <p className="brand-tagline">Your campus. Connected.</p>
        <div className="campus-label">
          <span className="campus-symbol">↗</span>
          <div>
            IIT ROORKEE<small>Campus mobility workspace</small>
          </div>
        </div>
        <label className="role-label" htmlFor="role">
          DEMO PERSPECTIVE
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => changeRole(e.target.value as Role)}
        >
          <option value="student">Student dashboard</option>
          <option value="driver">Driver dashboard</option>
          <option value="admin">Admin / Security</option>
          <option value="project">About the project</option>
        </select>
        <nav>
          {nav.map(([id, label, Icon]: any) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => {
                setTab(id);
                setQuery("");
                setFilter("all");
              }}
            >
              <Icon size={17} />
              <span>{label}</span>
              {id === "incidents" && openAlerts.length > 0 && (
                <b>{openAlerts.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="demo-control" onClick={() => setModal("demo")}>
            <Settings2 size={17} />
            Demo controls <ArrowUpRight size={14} />
          </button>
          <button
            className="project-link"
            onClick={() =>
              changeRole(role === "project" ? "student" : "project")
            }
          >
            <BookOpen size={15} />
            About the project
          </button>
          <div className="session-indicator">
            <span className={error ? "offline-dot" : "online-dot"} />
            <div>
              {connecting
                ? "Connecting session…"
                : error
                  ? "Connection needs attention"
                  : "Shared demo connected"}
              <small>
                {sync
                  ? `Last synced ${age(sync)}`
                  : "Persistent workspace · 7-day session"}
              </small>
            </div>
          </div>
          <div className="demo-caption">
            Role switching is a demonstration.
            <br />
            Demo fleet simulated · no real dispatch.
          </div>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <b>
              {role === "admin"
                ? "Security & operations"
                : role === "student"
                  ? "Student rides"
                  : role === "driver"
                    ? "Driver workspace"
                    : "The project"}
            </b>
          </div>
          <div className="header-actions">
            <Badge tone="gray">
              <Radio size={11} />
              SHARED DEMO
            </Badge>
            <button
              title="Share this session"
              onClick={() => {
                setJoin("");
                setModal("share");
              }}
            >
              <LinkIcon size={17} />
              <span>Share session</span>
            </button>
            <button
              aria-label="Open demo controls"
              onClick={() => setModal("demo")}
            >
              <Settings2 size={17} />
            </button>
            <span className="avatar">
              {role === "admin" ? "SC" : role === "driver" ? "DR" : "ST"}
            </span>
          </div>
        </header>
        <div className="content">
          {error && (
            <div className="error-banner" role="alert">
              <WifiOff size={18} />
              <span>
                {error} {state && "Showing the last received state."}
              </span>
              <button onClick={createSession}>New session</button>
            </div>
          )}
          {!state ? (
            <div className="start-screen">
              <div className="brand">
                <img src="/assets/raahi-icon.svg" alt="" />
                <span>
                  raahi<b>.</b>
                </span>
              </div>
              <h1>
                {connecting
                  ? "Connecting your campus…"
                  : "Start a shared workspace"}
              </h1>
              <p>
                {connecting
                  ? "Preparing your fleet and ride workspace."
                  : "Create a demo session to explore requests, driver trips, and security incidents across devices."}
              </p>
              {!connecting && (
                <button className="button" onClick={createSession}>
                  Create demo session <ArrowRight size={16} />
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    {role === "admin"
                      ? "CAMPUS OPERATIONS"
                      : role === "student"
                        ? "MOVE AROUND CAMPUS"
                        : role === "driver"
                          ? "YOUR NEXT PICKUP"
                          : "BUILT AT IIT ROORKEE"}
                  </p>
                  <h1>
                    {role === "admin"
                      ? tab === "incidents"
                        ? "Every incident, accounted for."
                        : tab === "fleet"
                          ? "Know your fleet."
                          : tab === "trips"
                            ? "Every campus journey."
                            : "A pulse on campus."
                      : role === "student"
                        ? tab === "active"
                          ? "Your ride, at a glance."
                          : tab === "history"
                            ? "Your campus journeys."
                            : tab === "saved"
                              ? "Your familiar places."
                              : "A little closer to everywhere."
                        : role === "driver"
                          ? tab === "current"
                            ? "One trip. Clear next steps."
                            : tab === "history"
                              ? "A day of moving campus."
                              : "Ready for the next pickup."
                          : "Small device. Safer journeys."}
                  </h1>
                  <p className="page-subtitle">
                    {role === "admin"
                      ? "Fleet visibility, ride coordination and a clear path from alert to action."
                      : role === "student"
                        ? "Find an e-rickshaw, choose your stop, and get going."
                        : role === "driver"
                          ? "Your requests, vehicle and current trip — together in one place."
                          : "Vehicle Tracking BTP · Sagar Baruah & Ponting"}
                  </p>
                </div>
                {role === "driver" ? (
                  <div className="driver-selector">
                    <label htmlFor="driverSelect">DEMO VEHICLE</label>
                    <select
                      id="driverSelect"
                      value={selected}
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      {vehicles.map((v: any) => (
                        <option key={v.id} value={v.id}>
                          {v.id} · {v.driver}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <button
                    className="button secondary"
                    onClick={() =>
                      role === "admin" ? exportData() : setModal("share")
                    }
                  >
                    {role === "admin" ? (
                      <ArrowDownToLine size={15} />
                    ) : (
                      <LinkIcon size={15} />
                    )}{" "}
                    {role === "admin"
                      ? "Export activity"
                      : "Try across devices"}
                  </button>
                )}
              </div>
              {role === "admin" && (
                <>
                  <TtnPanel live={ttn.live} simulated={ttn.simulated} error={ttn.error} />
                  <div className="stats">
                    <Stat
                      label="AVAILABLE VEHICLES"
                      value={vehicles
                        .filter((v: any) => v.online && !v.stale && !v.busy)
                        .length.toString()
                        .padStart(2, "0")}
                      note={`${vehicles.length} total vehicle nodes`}
                      icon={Truck}
                    />
                    <Stat
                      label="ONGOING RIDES"
                      value={rides
                        .filter((r: any) => activeStatuses.includes(r.status))
                        .length.toString()
                        .padStart(2, "0")}
                      note={`${rides.filter((r: any) => r.status === "pending").length} requests waiting`}
                      icon={Route}
                    />
                    <Stat
                      label="UNRESOLVED ALERTS"
                      value={openAlerts.length.toString().padStart(2, "0")}
                      note="Security follow-up required"
                      icon={Shield}
                      tone={openAlerts.length ? "amber-text" : ""}
                    />
                    <Stat
                      label="DEVICE ATTENTION"
                      value={vehicles
                        .filter((v: any) => !v.online || v.stale)
                        .length.toString()
                        .padStart(2, "0")}
                      note="Offline or telemetry over 5 min old"
                      icon={Activity}
                    />
                  </div>
                  {tab === "overview" ? (
                    <>
                      <div className="operations-grid">
                        {mapPanel()}
                        {incidentList()}
                      </div>
                      <div className="section-gap">{fleetTable()}</div>
                    </>
                  ) : tab === "fleet" ? (
                    <>
                      {fleetTable()}
                      <div className="two-col section-gap">
                        {mapPanel()}
                        {vehicleDetail()}
                      </div>
                    </>
                  ) : tab === "trips" ? (
                    tripTable()
                  ) : (
                    incidentList(true)
                  )}
                </>
              )}
              {role === "student" && (
                <>
                  {myActive && tab === "overview" && (
                    <button
                      className="active-ride-banner"
                      onClick={() => setTab("active")}
                    >
                      <Navigation size={18} />
                      <span>
                        You have a ride {labels[myActive.status].toLowerCase()}{" "}
                        · {myActive.vehicle}
                      </span>
                      View ride <ArrowRight size={16} />
                    </button>
                  )}
                  {tab === "overview" ? (
                    <>
                      <div className="booking-grid">
                        <div>
                          {mapPanel({ studentMap: true })}
                          <div className="route-summary">
                            {route ? (
                              <>
                                <Route size={19} />
                                <div>
                                  <b>
                                    {(route.meters / 1000).toFixed(2)} km mapped
                                    road route
                                  </b>
                                  <p>
                                    Approx. {route.minutes} min travel at an
                                    assumed 12 km/h · excludes pickup wait and
                                    access to the road.
                                  </p>
                                </div>
                                <Badge tone="gray">ESTIMATE</Badge>
                              </>
                            ) : (
                              <>
                                <Route size={20} />
                                <p>
                                  No connected vehicle-road route found. Choose
                                  another stop or use external navigation; no
                                  route is invented.
                                </p>
                              </>
                            )}
                          </div>
                          <div className="section-gap">
                            <Panel
                              title="Nearby rickshaws"
                              sub="Sample positions · refresh telemetry in Demo Controls"
                              action={
                                <Badge>{available.length} AVAILABLE</Badge>
                              }
                            >
                              <div className="nearby-list">
                                {available.length ? (
                                  available
                                    .slice()
                                    .sort((a: any, b: any) =>
                                      pickup
                                        ? distance(a, pickup) -
                                          distance(b, pickup)
                                        : 0,
                                    )
                                    .map((v: any) => (
                                      <button
                                        key={v.id}
                                        className={`nearby-vehicle ${selected === v.id ? "selected" : ""}`}
                                        onClick={() => {
                                          setSelected(v.id);
                                          setFocus({ ...v });
                                        }}
                                      >
                                        <span className="small-truck">
                                          <Truck size={22} />
                                        </span>
                                        <span>
                                          <b>{v.id}</b>
                                          <small>
                                            {v.driver} · {v.seats} seats
                                          </small>
                                        </span>
                                        <span className="nearby-distance">
                                          <b>
                                            {pickup
                                              ? `${Math.round(distance(v, pickup))} m`
                                              : "—"}
                                          </b>
                                          <small>straight-line distance</small>
                                        </span>
                                        <span className="radio-select" />
                                      </button>
                                    ))
                                ) : (
                                  <Empty title="No rickshaws available">
                                    Vehicles may be busy, offline or have stale
                                    samples. Ask a demo driver to go online or
                                    send fresh telemetry.
                                  </Empty>
                                )}
                              </div>
                            </Panel>
                          </div>
                        </div>
                        <div>
                          <Panel
                            title="Request a ride"
                            sub="Your next campus journey starts here."
                          >
                            <div className="booking-form">
                              <div className="stop-fields">
                                <label htmlFor="pickup">PICKUP</label>
                                <div className="stop-select">
                                  <MapPin size={17} />
                                  <select
                                    id="pickup"
                                    value={pickup?.id || "custom"}
                                    onChange={(e) => {
                                      const p = data.stops.find(
                                        (p: any) => p.id === e.target.value,
                                      );
                                      if (p) {
                                        setPickup(p);
                                        setFocus(p);
                                      }
                                    }}
                                  >
                                    {pickup && !pickup.id && (
                                      <option value="custom">
                                        {pickup.name}
                                      </option>
                                    )}
                                    {data?.stops.map((p: any) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <label htmlFor="destination">DESTINATION</label>
                                <div className="stop-select destination">
                                  <Flag size={17} />
                                  <select
                                    id="destination"
                                    value={destination?.id || "custom"}
                                    onChange={(e) => {
                                      const p = data.stops.find(
                                        (p: any) => p.id === e.target.value,
                                      );
                                      if (p) {
                                        setDestination(p);
                                        setFocus(p);
                                      }
                                    }}
                                  >
                                    {destination && !destination.id && (
                                      <option value="custom">
                                        {destination.name}
                                      </option>
                                    )}
                                    {data?.stops.map((p: any) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="map-choice">
                                <button
                                  onClick={() => setPickMode("pickup")}
                                  className={
                                    pickMode === "pickup" ? "active" : ""
                                  }
                                >
                                  Pick pickup on map
                                </button>
                                <button
                                  onClick={() => setPickMode("destination")}
                                  className={
                                    pickMode === "destination" ? "active" : ""
                                  }
                                >
                                  Pick destination
                                </button>
                              </div>
                              <button
                                className="location-button"
                                onClick={geolocate}
                              >
                                <LocateFixed size={15} />
                                Use my location for pickup
                              </button>
                              <div className="form-row">
                                <div>
                                  <label htmlFor="passengers">PASSENGERS</label>
                                  <select
                                    id="passengers"
                                    value={people}
                                    onChange={(e) =>
                                      setPeople(Number(e.target.value))
                                    }
                                  >
                                    {[1, 2, 3, 4].map((n) => (
                                      <option key={n}>{n}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label htmlFor="vehicleChoice">
                                    RICKSHAW
                                  </label>
                                  <select
                                    id="vehicleChoice"
                                    value={selected}
                                    onChange={(e) =>
                                      setSelected(e.target.value)
                                    }
                                  >
                                    {vehicles.map((v: any) => (
                                      <option key={v.id} value={v.id}>
                                        {v.id}
                                        {!available.some(
                                          (a: any) => a.id === v.id,
                                        )
                                          ? " · unavailable"
                                          : ""}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="booking-info">
                                <Shield size={17} />
                                <p>
                                  Campus speed limit <b>25 km/h</b>
                                  <br />
                                  No payment is collected in this demo.
                                </p>
                              </div>
                              <button
                                className="button full"
                                disabled={
                                  busy ||
                                  !!myActive ||
                                  !available.some(
                                    (v: any) => v.id === selected,
                                  ) ||
                                  !pickup ||
                                  !destination
                                }
                                onClick={requestRide}
                              >
                                {busy
                                  ? "Sending request…"
                                  : myActive
                                    ? "You already have an active ride"
                                    : "Request a ride"}
                                <ArrowRight size={17} />
                              </button>
                              <p className="form-caption">
                                Driver acceptance is required. No invented
                                pickup ETA.
                              </p>
                            </div>
                          </Panel>
                          <div className="help-card">
                            <div>
                              <LinkIcon size={20} />
                              <h3>Try the complete journey</h3>
                            </div>
                            <p>
                              Share this session with another phone. Choose
                              Driver there to receive and accept your request.
                            </p>
                            <button
                              className="text-button"
                              onClick={() => setModal("share")}
                            >
                              Share demo session <ArrowUpRight size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : tab === "active" ? (
                    <div className="two-col">
                      <Panel
                        title="Current ride"
                        sub="Updates sync automatically across this demo session."
                      >
                        {myActive ? (
                          rideCard(myActive)
                        ) : (
                          <Empty title="No active ride">
                            Book a pickup from the Book a Ride tab.
                          </Empty>
                        )}
                      </Panel>
                      <div>{mapPanel({ studentMap: true })}</div>
                    </div>
                  ) : tab === "history" ? (
                    <Panel
                      title="Your ride history"
                      sub="Only requests from this browser's demo student identity."
                    >
                      {mine.length ? (
                        mine
                          .slice()
                          .reverse()
                          .map((r: any) => rideCard(r))
                      ) : (
                        <Empty title="Your first journey starts here">
                          Book a ride to see its progress and history.
                        </Empty>
                      )}
                    </Panel>
                  ) : (
                    <Panel
                      title="Saved campus places"
                      sub="Saved on this device for quick booking."
                    >
                      <div className="saved-grid">
                        {data?.stops.map((p: any) => (
                          <div className="saved-place" key={p.id}>
                            <MapPin size={19} />
                            <div>
                              <b>{p.name}</b>
                              <a
                                href={p.source}
                                target="_blank"
                                rel="noreferrer"
                              >
                                View map source ↗
                              </a>
                            </div>
                            <button
                              aria-label={`${favorites.includes(p.id) ? "Unsave" : "Save"} ${p.name}`}
                              onClick={() => saveFavorite(p.id)}
                            >
                              <Heart
                                size={18}
                                fill={
                                  favorites.includes(p.id) ? "#72e3bd" : "none"
                                }
                              />
                            </button>
                            {favorites.includes(p.id) && (
                              <button
                                className="text-button"
                                onClick={() => {
                                  setDestination(p);
                                  setTab("overview");
                                  setFocus(p);
                                }}
                              >
                                Go here <ArrowRight size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </Panel>
                  )}
                </>
              )}
              {role === "driver" && (
                <>
                  <div className="driver-status-bar">
                    <div>
                      <span
                        className={
                          currentVehicle?.online ? "online-dot" : "offline-dot"
                        }
                      />
                      <b>
                        {currentVehicle?.online
                          ? "You are online"
                          : "You are offline"}
                      </b>
                      <span>
                        {driverActive
                          ? "Current trip in progress"
                          : currentVehicle?.online
                            ? "Ready to receive pickup requests"
                            : "Go online to accept requests"}
                      </span>
                    </div>
                    <button
                      className={`button compact ${currentVehicle?.online ? "secondary" : ""}`}
                      disabled={busy || !!driverActive}
                      onClick={async () => {
                        if (
                          await act({
                            action: "availability",
                            vehicle: selected,
                            online: !currentVehicle.online,
                            seats: currentVehicle.seats,
                          })
                        )
                          notify(
                            currentVehicle.online
                              ? "You are now offline"
                              : "You are now online",
                          );
                      }}
                    >
                      {currentVehicle?.online ? "Go offline" : "Go online"}
                    </button>
                  </div>
                  {currentVehicle?.speed > 25 && (
                    <div className="speed-warning">
                      <TriangleAlert size={21} />
                      <div>
                        <b>Slow down · {currentVehicle.speed} km/h</b>
                        <p>
                          The campus limit is 25 km/h. An overspeed event is
                          visible to security in this demo.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="stats">
                    <Stat
                      label="WAITING FOR YOU"
                      value={rides
                        .filter(
                          (r: any) =>
                            r.vehicle === selected && r.status === "pending",
                        )
                        .length.toString()
                        .padStart(2, "0")}
                      note="Incoming pickup requests"
                      icon={Users}
                    />
                    <Stat
                      label="CURRENT TRIP"
                      value={driverActive ? "01" : "00"}
                      note={
                        driverActive
                          ? labels[driverActive.status]
                          : "Ready for your next ride"
                      }
                      icon={Navigation}
                    />
                    <Stat
                      label="COMPLETED TODAY"
                      value={rides
                        .filter(
                          (r: any) =>
                            r.vehicle === selected &&
                            r.status === "completed" &&
                            new Date(r.updated).toLocaleDateString("en-IN", {
                              timeZone: "Asia/Kolkata",
                            }) ===
                              new Date().toLocaleDateString("en-IN", {
                                timeZone: "Asia/Kolkata",
                              }),
                        )
                        .length.toString()
                        .padStart(2, "0")}
                      note="In this shared demo workspace"
                      icon={CheckCircle2}
                    />
                    <Stat
                      label="DEVICE BATTERY"
                      value={`${currentVehicle?.battery}%`}
                      note={`${currentVehicle?.stale ? "Stale sample" : "Demo sample"} · ${age(currentVehicle?.updated)}`}
                      icon={Battery}
                    />
                  </div>
                  {tab === "history" ? (
                    <Panel
                      title="Completed rides"
                      sub="Your completed journeys in this demo session."
                    >
                      {rides.filter(
                        (r: any) =>
                          r.vehicle === selected && r.status === "completed",
                      ).length ? (
                        rides
                          .filter(
                            (r: any) =>
                              r.vehicle === selected &&
                              r.status === "completed",
                          )
                          .slice()
                          .reverse()
                          .map((r: any) => rideCard(r, true))
                      ) : (
                        <Empty title="No completed journeys yet">
                          Finish your current trip to add it here.
                        </Empty>
                      )}
                    </Panel>
                  ) : (
                    <div className="driver-grid">
                      <div>
                        <Panel
                          title={
                            tab === "current"
                              ? "Current trip"
                              : "Your ride desk"
                          }
                          sub="Accept one trip at a time. Progress is shared with the student."
                        >
                          {driverActive ? (
                            rideCard(driverActive, true)
                          ) : (
                            <Empty title="Ready when you are">
                              Accept an incoming request to start your next
                              pickup.
                            </Empty>
                          )}
                        </Panel>
                        {tab === "overview" && (
                          <div className="section-gap">
                            <Panel
                              title="Incoming pickups"
                              sub="Requests addressed to your selected demo vehicle."
                            >
                              {rides.filter(
                                (r: any) =>
                                  r.vehicle === selected &&
                                  r.status === "pending",
                              ).length ? (
                                rides
                                  .filter(
                                    (r: any) =>
                                      r.vehicle === selected &&
                                      r.status === "pending",
                                  )
                                  .map((r: any) => rideCard(r, true))
                              ) : (
                                <Empty icon={Users} title="No pickups waiting">
                                  Student requests for {selected} will appear
                                  here automatically.
                                </Empty>
                              )}
                            </Panel>
                          </div>
                        )}
                        <div className="section-gap">
                          {mapPanel({ driverMap: true })}
                        </div>
                      </div>
                      <div>
                        {vehicleDetail()}
                        <Panel
                          title="Vehicle availability"
                          sub="Set how many passenger seats are available."
                          className="section-gap"
                        >
                          <div className="padded">
                            <label htmlFor="seats">AVAILABLE SEATS</label>
                            <select
                              id="seats"
                              disabled={busy || !!driverActive}
                              value={currentVehicle?.seats}
                              onChange={async (e) => {
                                if (
                                  await act({
                                    action: "availability",
                                    vehicle: selected,
                                    online: currentVehicle.online,
                                    seats: Number(e.target.value),
                                  })
                                )
                                  notify("Seat availability updated");
                              }}
                            >
                              {[1, 2, 3, 4].map((x) => (
                                <option key={x} value={x}>
                                  {x} seats
                                </option>
                              ))}
                            </select>
                            <p className="small-note">
                              Availability changes are locked during an active
                              trip.
                            </p>
                          </div>
                        </Panel>
                        <div className="sos-card">
                          <Shield size={23} />
                          <h3>Need assistance?</h3>
                          <p>
                            Send a demo SOS event to the security incident
                            centre. This does not contact campus security or
                            emergency services.
                          </p>
                          <button
                            className="button danger full"
                            onClick={() => setModal("sos")}
                          >
                            Send demo SOS <TriangleAlert size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              {role === "project" && (
                <>
                  <div className="project-grid">
                    <Panel
                      title="The working prototype"
                      sub="Heltec CubeCell AB02S + ADXL345"
                    >
                      <img
                        className="project-image"
                        src="/assets/prototype.jpeg"
                        alt="Actual CubeCell and accelerometer breadboard prototype"
                      />
                      <div className="padded">
                        <p className="body-copy">
                          Acceleration acquisition, OLED readings and a working
                          visualization form the hardware foundation. GPS
                          telemetry and a validated collision detector are the
                          next integration steps.
                        </p>
                      </div>
                    </Panel>
                    <Panel
                      title="Device demonstration"
                      sub="Original project video"
                    >
                      <video
                        className="project-video"
                        controls
                        playsInline
                        preload="metadata"
                        src="/assets/acceleration-demo.mp4"
                      />
                      <div className="padded">
                        <p className="body-copy">
                          Your original acceleration visualization
                          demonstration, preserved alongside the fleet
                          interface.
                        </p>
                      </div>
                    </Panel>
                  </div>
                  <Panel
                    title="What works, and what comes next"
                    sub="Implementation status"
                    className="section-gap"
                  >
                    <div className="capabilities">
                      <div>
                        <Badge>WORKING</Badge>
                        <h3>Real campus map</h3>
                        <p>
                          OpenStreetMap roads, buildings, landmarks, map-point
                          booking and a mapped road-route preview.
                        </p>
                      </div>
                      <div>
                        <Badge>WORKING</Badge>
                        <h3>Shared ride workflows</h3>
                        <p>
                          Persistent cloud demo sessions. Requests, driver
                          acceptance, trip stages and incident handling sync
                          across devices.
                        </p>
                      </div>
                      <div>
                        <Badge tone="amber">INTEGRATION NEEDED</Badge>
                        <h3>Live deployment</h3>
                        <p>
                          Hardware telemetry, validated IMU incident detection,
                          production authentication, verified driver accounts
                          and real security dispatch remain to be connected.
                          Demo role switching provides no production access
                          control.
                        </p>
                      </div>
                    </div>
                    <div className="resources">
                      <a
                        href="/assets/progress-report.pdf"
                        download
                        className="button secondary"
                      >
                        <ArrowDownToLine size={15} />
                        Progress report
                      </a>
                      <a
                        href="/assets/progress-presentation.pptx"
                        download
                        className="button secondary"
                      >
                        <ArrowDownToLine size={15} />
                        Presentation
                      </a>
                    </div>
                  </Panel>
                </>
              )}
            </>
          )}
        </div>
        <footer>
          <span>
            raahi<span className="mint-text">.</span>{" "}
            <b>Your campus. Connected.</b>
          </span>
          <span>IIT Roorkee · BTP demonstration · No live dispatch</span>
        </footer>
      </main>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal("")}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "demo"
                ? "Demo controls"
                : modal === "share"
                  ? "Share demo session"
                  : "Ride or incident details"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Close dialog"
              onClick={() => setModal("")}
            >
              <X size={20} />
            </button>
            {modal === "share" ? (
              <>
                <p className="eyebrow">TRY IT TOGETHER</p>
                <h2>One session. Every perspective.</h2>
                <p className="modal-copy">
                  Copy a link and open it on another device. Requests and
                  updates sync every few seconds. Anyone with this session link
                  can operate all demo roles; use sample data only. Sessions
                  expire after 7 days.
                </p>
                <label htmlFor="shareUrl">THIS SESSION LINK</label>
                <input
                  id="shareUrl"
                  readOnly
                  value={
                    key
                      ? `${typeof location !== "undefined" ? location.origin : ""}/#${new URLSearchParams({ session: key, role, vehicle: selected })}`
                      : ""
                  }
                  onFocus={(e) => e.target.select()}
                />
                <div className="share-roles">
                  {(["student", "driver", "admin"] as Role[]).map((r) => (
                    <button key={r} onClick={() => copyLink(r)}>
                      <span>
                        {r === "student" ? (
                          <Users />
                        ) : r === "driver" ? (
                          <Truck />
                        ) : (
                          <Shield />
                        )}
                      </span>
                      <div>
                        <b>
                          {r === "admin"
                            ? "Admin / Security"
                            : r[0].toUpperCase() + r.slice(1)}
                        </b>
                        <small>Copy session link for this perspective</small>
                      </div>
                      <Copy size={17} />
                    </button>
                  ))}
                </div>
                <label htmlFor="join">JOIN AN EXISTING SESSION</label>
                <input
                  id="join"
                  placeholder="Paste a Raahi session link"
                  value={join}
                  onChange={(e) => setJoin(e.target.value)}
                />
                <button
                  className="button full"
                  onClick={() => {
                    try {
                      const u = new URL(join);
                      const token = new URLSearchParams(u.hash.slice(1)).get(
                        "session",
                      );
                      if (!token || !/^[\w-]{64,100}$/.test(token))
                        throw Error();
                      setKey(token);
                      localStorage.setItem("raahi-session", token);
                      setModal("");
                      setConnecting(true);
                      notify("Joining shared demo session");
                    } catch {
                      notify("Paste a valid Raahi shared session link");
                    }
                  }}
                >
                  Join session <ArrowRight size={16} />
                </button>
              </>
            ) : modal === "demo" ? (
              <>
                <p className="eyebrow">DEMONSTRATION LAB</p>
                <h2>Test the fleet workflow.</h2>
                <p className="modal-copy">
                  These controls generate sample telemetry and incidents in your
                  shared session. They do not represent live hardware events.
                </p>
                <label htmlFor="simVehicle">VEHICLE</label>
                <select
                  id="simVehicle"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {vehicles.map((v: any) => (
                    <option key={v.id}>{v.id}</option>
                  ))}
                </select>
                <div className="sim-speed">
                  <div>
                    <label htmlFor="simSpeed">SPEED SAMPLE</label>
                    <input
                      id="simSpeed"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                    />
                  </div>
                  <span>
                    km/h <small>Limit: 25 km/h</small>
                  </span>
                </div>
                <button
                  disabled={busy}
                  className="button full"
                  onClick={async () => {
                    if (
                      await act({
                        action: "telemetry",
                        vehicle: selected,
                        speed,
                      })
                    )
                      notify(
                        speed > 25
                          ? "Overspeed event recorded for security"
                          : "Fresh telemetry sample received",
                      );
                  }}
                >
                  <Radio size={16} />
                  Send telemetry sample
                </button>
                <div className="sim-buttons">
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        await act({
                          action: "telemetry",
                          vehicle: selected,
                          speed: 0,
                        })
                      )
                        notify("Vehicle telemetry refreshed");
                    }}
                  >
                    <RefreshCw size={15} />
                    Refresh stationary sample
                  </button>
                  <button
                    className="button danger"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        await act({
                          action: "incident",
                          type: "collision",
                          vehicle: selected,
                        })
                      )
                        notify(
                          "Possible collision event recorded for security",
                        );
                    }}
                  >
                    <TriangleAlert size={15} />
                    Simulate collision
                  </button>
                </div>
                <p className="small-note">
                  An unresolved overspeed event is deduplicated per vehicle. The
                  exact threshold is strictly above 25 km/h. Samples become
                  stale after 5 minutes.
                </p>
                <div className="modal-divider" />
                <button className="text-button" onClick={() => setModal("new")}>
                  Create a fresh demo workspace <Plus size={14} />
                </button>
              </>
            ) : modal === "new" ? (
              <>
                <h2>Start a fresh workspace?</h2>
                <p className="modal-copy">
                  This creates a separate demo session. The existing session
                  remains available through its shared link until expiry.
                </p>
                <button
                  className="button full"
                  onClick={() => {
                    createSession();
                    setModal("");
                  }}
                >
                  Create new session
                </button>
              </>
            ) : modal === "cancel" ? (
              <>
                <h2>Cancel this pickup?</h2>
                <p className="modal-copy">
                  The driver and admin will see the updated status.
                </p>
                <label htmlFor="cancelReason">REASON</label>
                <textarea
                  id="cancelReason"
                  maxLength={200}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. My plans changed"
                />
                <button
                  className="button danger full"
                  disabled={busy || !note.trim()}
                  onClick={async () => {
                    if (
                      await act({
                        action: "trip",
                        id: rideTarget.id,
                        student,
                        status: "cancelled",
                        note,
                      })
                    ) {
                      setModal("");
                      notify("Pickup cancelled");
                    }
                  }}
                >
                  Confirm cancellation
                </button>
              </>
            ) : modal === "sos" ? (
              <>
                <Badge tone="red">DEMO ONLY</Badge>
                <h2>Send a demo SOS?</h2>
                <p className="modal-copy">
                  Creates an SOS incident for {selected} in this session's Admin
                  dashboard. It does not call or notify real emergency services.
                </p>
                <button
                  className="button danger full"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await act({
                        action: "incident",
                        type: "sos",
                        vehicle: selected,
                      })
                    ) {
                      setModal("");
                      notify("Demo SOS recorded in security inbox");
                    }
                  }}
                >
                  Send demo SOS
                </button>
              </>
            ) : modal === "incident" && incident ? (
              (() => {
                const a =
                  alerts.find((a: any) => a.id === incident.id) || incident;
                const next: any = {
                  open: "acknowledged",
                  acknowledged: "under_review",
                  under_review: "resolved",
                };
                return (
                  <>
                    <Badge tone={a.type === "overspeed" ? "amber" : "red"}>
                      {labels[a.status]}
                    </Badge>
                    <h2>
                      {a.type === "overspeed"
                        ? "Overspeed incident"
                        : a.type === "collision"
                          ? "Possible collision"
                          : "Driver SOS"}
                    </h2>
                    <p className="modal-copy">
                      {a.vehicle} · {fmt(a.at)} IST
                      <br />
                      {a.type === "overspeed"
                        ? `${a.speed} km/h recorded. Campus limit: 25 km/h.`
                        : "Simulated event. Verify with the driver before treating it as a confirmed incident."}
                    </p>
                    <a
                      className="incident-location"
                      href={`https://www.openstreetmap.org/?mlat=${a.lat}&mlon=${a.lng}#map=18/${a.lat}/${a.lng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin size={16} />
                      {a.lat.toFixed(5)}, {a.lng.toFixed(5)}{" "}
                      <ArrowUpRight size={14} />
                    </a>
                    <div className="timeline">
                      {a.history.map((h: any, i: number) => (
                        <div key={i}>
                          <i />
                          <span>
                            <b>{labels[h.status]}</b>
                            <small>
                              {fmt(h.at)} IST{h.note ? ` · ${h.note}` : ""}
                            </small>
                          </span>
                        </div>
                      ))}
                    </div>
                    {a.status !== "resolved" && (
                      <>
                        <label htmlFor="incidentNote">
                          {a.status === "under_review"
                            ? "RESOLUTION NOTE (REQUIRED)"
                            : "HANDLING NOTE"}
                        </label>
                        <textarea
                          id="incidentNote"
                          maxLength={500}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Record the action taken…"
                        />
                        <button
                          className="button full"
                          disabled={
                            busy ||
                            (a.status === "under_review" && !note.trim())
                          }
                          onClick={async () => {
                            if (
                              await act({
                                action: "alert",
                                id: a.id,
                                status: next[a.status],
                                note,
                              })
                            ) {
                              notify(
                                `Incident ${labels[next[a.status]].toLowerCase()}`,
                              );
                              setNote("");
                            }
                          }}
                        >
                          {a.status === "open"
                            ? "Acknowledge incident"
                            : a.status === "acknowledged"
                              ? "Mark under review"
                              : "Resolve incident"}
                          <Check size={16} />
                        </button>
                      </>
                    )}
                  </>
                );
              })()
            ) : modal === "timeline" && rideTarget ? (
              <>
                <p className="eyebrow">
                  RIDE #{rideTarget.id.slice(0, 6).toUpperCase()}
                </p>
                <h2>Journey timeline</h2>
                <p className="modal-copy">
                  {rideTarget.pickup.name} → {rideTarget.destination.name}
                  <br />
                  {rideTarget.vehicle} · {rideTarget.people} passengers
                </p>
                <div className="timeline">
                  {(
                    rides.find((r: any) => r.id === rideTarget.id) || rideTarget
                  ).history.map((h: any, i: number) => (
                    <div key={i}>
                      <i />
                      <span>
                        <b>{labels[h.status]}</b>
                        <small>{fmt(h.at)} IST</small>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
  function fleetTable() {
    return (
      <Panel
        title="Fleet & device health"
        sub="Inspect availability, speed and telemetry freshness."
      >
        <div className="table-toolbar">
          <div className="search">
            <Search size={15} />
            <input
              aria-label="Search fleet"
              placeholder="Search a vehicle or driver…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter fleet"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {[
              ["all", "All vehicles"],
              ["available", "Available"],
              ["occupied", "On a trip"],
              ["offline", "Offline"],
              ["stale", "Stale telemetry"],
              ["alerts", "With alerts"],
            ].map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>VEHICLE / DRIVER</th>
                <th>AVAILABILITY</th>
                <th>SPEED</th>
                <th>BATTERY</th>
                <th>LAST SAMPLE</th>
                <th>LOCATION</th>
              </tr>
            </thead>
            <tbody>
              {displayVehicles.map((v: any) => (
                <tr
                  key={v.id}
                  className={selected === v.id ? "selected-row" : ""}
                  onClick={() => {
                    setSelected(v.id);
                    setFocus({ ...v });
                    if (tab === "overview") setTab("fleet");
                  }}
                >
                  <td>
                    <span className="table-vehicle">
                      <Truck size={17} />
                      <span>
                        <b>{v.id}</b>
                        <small>{v.driver}</small>
                      </span>
                    </span>
                  </td>
                  <td>
                    <Badge
                      tone={
                        v.stale
                          ? "amber"
                          : !v.online
                            ? "gray"
                            : v.busy
                              ? "violet"
                              : "mint"
                      }
                    >
                      {vehicleStatus(v)}
                    </Badge>
                  </td>
                  <td className={v.speed > 25 ? "amber-text" : ""}>
                    {v.speed} km/h
                  </td>
                  <td>
                    <span className="battery-bar">
                      <i style={{ width: `${v.battery}%` }} />
                    </span>
                    {v.battery}%
                  </td>
                  <td>
                    {age(v.updated)}
                    <small>
                      {v.stale ? "Stale · refresh needed" : "Demo telemetry"}
                    </small>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(v.id);
                        setFocus({ ...v });
                        setTab("fleet");
                      }}
                    >
                      <MapPin size={14} />
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!displayVehicles.length && (
            <Empty title="No vehicles match">
              Try a different filter or search term.
            </Empty>
          )}
        </div>
      </Panel>
    );
  }
}
function LayersIcon() {
  return <MapPin size={13} />;
}
