"use client";
import { useEffect, useRef, useState } from "react";
import { LocateFixed, Plus, Minus, Layers, MapPin } from "lucide-react";
let leafletPromise: Promise<any> | null = null;
function load() {
  if ((window as any).L) return Promise.resolve((window as any).L);
  if (!leafletPromise)
    leafletPromise = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "/vendor/leaflet.css";
      document.head.appendChild(css);
      const script = document.createElement("script");
      script.src = "/vendor/leaflet.js";
      script.onload = () => resolve((window as any).L);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  return leafletPromise;
}
export default function CampusMap({
  data,
  vehicles,
  selected,
  onSelect,
  onPoint,
  pickup,
  destination,
  path,
  focus,
}: any) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<any>(null),
    layer = useRef<any>(null),
    latest = useRef<any>({});
  latest.current = { onSelect, onPoint };
  const [error, setError] = useState(""),
    [light, setLight] = useState(false),
    [ready, setReady] = useState(0);
  const base = useRef<any>(null);
  useEffect(() => {
    let cancelled = false;
    load()
      .then((L) => {
        if (cancelled || !container.current) return;
        const m = L.map(container.current, {
          zoomControl: false,
          attributionControl: true,
          minZoom: 15,
          maxZoom: 19,
          maxBounds: [
            [29.854, 77.882],
            [29.879, 77.911],
          ],
        }).setView([29.8668, 77.8958], 16);
        map.current = m;
        m.attributionControl.addAttribution(
          '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
        );
        base.current = L.geoJSON(data, {
          style: (f: any) => ({
            color:
              f.properties.kind === "road"
                ? "#405869"
                : f.properties.kind === "green"
                  ? "#244c44"
                  : "#294357",
            weight:
              f.properties.kind === "road"
                ? ["footway", "path"].includes(f.properties.highway)
                  ? 1
                  : 4
                : 1,
            fillColor: f.properties.kind === "green" ? "#173a33" : "#1b3043",
            fillOpacity: 0.9,
          }),
        }).addTo(m);
        for (const stop of data.stops)
          L.circleMarker([stop.lat, stop.lng], {
            radius: 3,
            color: "#8ba9ac",
            weight: 1,
            fillOpacity: 0.9,
          })
            .bindTooltip(stop.name, {
              direction: "top",
              permanent: true,
              className: "stop-label",
            })
            .addTo(m);
        layer.current = L.layerGroup().addTo(m);
        m.on("click", (e: any) =>
          latest.current.onPoint?.({
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            name: "Selected map point",
          }),
        );
        setReady(1);
        setTimeout(() => m.invalidateSize(), 150);
      })
      .catch(() => setError("Map could not load. Please refresh."));
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, [data]);
  useEffect(() => {
    if (!map.current || !layer.current) return;
    const L = (window as any).L,
      g = layer.current;
    g.clearLayers();
    for (const v of vehicles) {
      const busy = v.busy;
      const stale = Date.now() - v.updated > 300000,
        color =
          !v.online || stale
            ? "#77899e"
            : v.speed > 25
              ? "#ffc185"
              : busy
                ? "#8d9dff"
                : "#72e3bd";
      const marker = L.marker([v.lat, v.lng], {
        icon: L.divIcon({
          className: "vehicle-marker",
          html: `<div style="--marker:${color}" class="vehicle-pin ${v.id === selected ? "selected" : ""}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 15V8l3-3h8l3 3v7M4 15h16M7 8h10M8 15v3M16 15v3"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/></svg><span>${v.id.slice(-2)}</span></div>`,
          iconSize: [48, 38],
          iconAnchor: [24, 20],
        }),
      }).addTo(g);
      marker.on("click", () => latest.current.onSelect?.(v.id));
      marker.bindTooltip(
        `${v.id} · ${stale ? "Stale" : !v.online ? "Offline" : busy ? "On a trip" : "Available"} · Demo`,
        { direction: "top" },
      );
    }
    for (const [p, label, color] of [
      [pickup, "P", "#72e3bd"],
      [destination, "D", "#a7afff"],
    ])
      if (p)
        L.marker([p.lat, p.lng], {
          icon: L.divIcon({
            className: "point-icon",
            html: `<span style="background:${color}">${label}</span>`,
            iconSize: [25, 25],
          }),
        }).addTo(g);
    if (path?.length > 1)
      L.polyline(
        path.map((p: any) => [p.lat, p.lng]),
        { color: "#72e3bd", weight: 5, opacity: 0.9 },
      ).addTo(g);
  }, [vehicles, selected, pickup, destination, path, data, ready]);
  useEffect(() => {
    if (focus && map.current)
      map.current.flyTo([focus.lat, focus.lng], 18, { duration: 0.6 });
  }, [focus]);
  const routeKey = path?.map((p: any) => `${p.lat},${p.lng}`).join(";") || "";
  useEffect(() => {
    if (ready && path?.length > 1 && map.current) {
      map.current.fitBounds(
        path.map((p: any) => [p.lat, p.lng]),
        { padding: [50, 75], maxZoom: 17 },
      );
    }
  }, [routeKey, ready]);
  function toggleStyle() {
    const next = !light;
    setLight(next);
    base.current?.setStyle((f: any) => ({
      color:
        f.properties.kind === "road"
          ? next
            ? "#a1b8b6"
            : "#405869"
          : f.properties.kind === "green"
            ? next
              ? "#abc6ad"
              : "#244c44"
            : next
              ? "#b7c8c5"
              : "#294357",
      weight:
        f.properties.kind === "road"
          ? ["footway", "path"].includes(f.properties.highway)
            ? 1
            : 4
          : 1,
      fillColor:
        f.properties.kind === "green"
          ? next
            ? "#c8dfbd"
            : "#173a33"
          : next
            ? "#d4dfd9"
            : "#1b3043",
      fillOpacity: 0.95,
    }));
  }

  return (
    <div className="campus-map">
      <div
        ref={container}
        className={`map-canvas ${light ? "light" : ""}`}
        aria-label="Interactive geographic map of IIT Roorkee"
      />
      <div className="map-top">
        <span>
          <i /> IIT ROORKEE <b>REAL MAP</b>
        </span>
        <button onClick={toggleStyle} title="Change campus map style">
          <Layers size={15} />
          {light ? "Dark map" : "Light map"}
        </button>
      </div>
      <div className="map-controls">
        <button aria-label="Zoom in" onClick={() => map.current?.zoomIn()}>
          <Plus size={18} />
        </button>
        <button aria-label="Zoom out" onClick={() => map.current?.zoomOut()}>
          <Minus size={18} />
        </button>
        <button
          aria-label="Recenter campus"
          onClick={() => map.current?.setView([29.8668, 77.8958], 16)}
        >
          <LocateFixed size={18} />
        </button>
      </div>
      <div className="map-bottom">
        <MapPin size={12} />{" "}
        {onPoint
          ? "Click the map to choose a stop"
          : "Mapped roads & landmarks · vehicle positions simulated"}
      </div>
      {error && (
        <div className="map-error" role="status">
          {error}
        </div>
      )}
    </div>
  );
}
