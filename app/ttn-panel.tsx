'use client';
import { useEffect, useState } from 'react';

type RecordData = {
  received_at: string; message_type: string | null; gps_valid: boolean | null;
  latitude: number | null; longitude: number | null; gps_age_ms_at_snapshot: number | null;
  altitude_valid: boolean | null; altitude_m: number | null; speed_valid: boolean | null; speed_kmph: number | null;
  sensor_fresh: boolean | null; detector_armed: boolean | null; crash_alert: boolean | null;
  impact_candidate: boolean | null; suspected_rollover: boolean | null; crash_status: string | null;
  gateway_id: string | null; rssi_dbm: number | null; snr_db: number | null; battery_percentage: number | null;
  fifo_warning: boolean | null; event_queue_overflow: boolean | null; sensor_clipped: boolean | null; decoder_warnings: string[]; diagnostic_warnings?: string[];
};
export type TtnView = { simulated: boolean; latest: RecordData | null; last_known_gps: RecordData | null; history: RecordData[] };
const age = (time: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(time)) / 1000));
  return seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds / 60)}m ago`;
};
const value = (n: number | null | undefined, unit: string) => n == null ? 'Unavailable' : `${n} ${unit}`;
export function useTtn(key: string, enabled: boolean) {
  const [live, setLive] = useState<TtnView | null>(null), [simulated, setSimulated] = useState<TtnView | null>(null), [error, setError] = useState('');
  useEffect(() => {
    if (!key || !enabled) return;
    let active = true;
    const poll = async () => {
      try {
        const get = async (sim: boolean) => {
          const res = await fetch(`/api/vehicles/raahi-vt/telemetry?limit=50&simulated=${sim}`, { headers: { 'X-Raahi-Session': key }, cache: 'no-store' });
          if (!res.ok) throw new Error('Device telemetry is not configured or temporarily unavailable.');
          return res.json() as Promise<TtnView>;
        };
        const [a, b] = await Promise.all([get(false), get(true)]);
        if (active) { setLive(a); setSimulated(b); setError(''); }
      } catch (e) { if (active) { setError(e instanceof Error ? e.message : 'Telemetry unavailable'); setLive(null); setSimulated(null); } }
    };
    void poll(); const timer = setInterval(poll, 20000);
    return () => { active = false; clearInterval(timer); };
  }, [key, enabled]);
  return { live, simulated, error };
}
export default function TtnPanel({ live, simulated, error }: { live: TtnView | null; simulated: TtnView | null; error: string }) {
  const [showSimulated, setShowSimulated] = useState(false);
  const view = showSimulated ? simulated : live, r = view?.latest, gps = view?.last_known_gps;
  const isStale = r ? Date.now() - Date.parse(r.received_at) > 300000 : true;
  const currentGps = r?.message_type === 'periodic' && r.gps_valid === true && r.latitude != null && r.longitude != null;
  const warnings = [ ...(r?.decoder_warnings || []), ...(r?.diagnostic_warnings || []), ...(r?.fifo_warning ? ['Sensor FIFO warning'] : []), ...(r?.event_queue_overflow ? ['Event queue overflow'] : []), ...(r?.sensor_clipped ? ['Sensor clipped'] : []) ];
  return <section className="panel section-gap" aria-label="TTN device telemetry">
    <div className="panel-head"><div><h2>TTN device · raahi-vt</h2><p>Real hardware telemetry is separate from the simulated fleet. Anyone with a demo session can view this device.</p></div></div>
    <div className="ttn-content">
      <div className="ttn-switch"><button className="button secondary" onClick={() => setShowSimulated(false)} aria-pressed={!showSimulated}>Real device</button> <button className="button secondary" onClick={() => setShowSimulated(true)} aria-pressed={showSimulated}>Simulated tests</button></div>
      {error ? <p role="status">{error}</p> : !r ? <p>No {showSimulated ? 'simulated' : 'real'} uplink received.</p> : <>
        <p><strong>{showSimulated ? 'Simulated test' : 'Real TTN uplink'}</strong> · {isStale ? 'Stale / offline' : 'Recent uplink'} · {age(r.received_at)} ({new Date(r.received_at).toLocaleString()})</p>
        <div className="ttn-grid">
          <div><small>GPS fix</small><strong>{currentGps ? 'Valid periodic fix' : 'GPS unavailable for current position'}</strong></div>
          <div><small>Last-known position</small><strong>{gps ? `${gps.latitude}, ${gps.longitude} · received ${age(gps.received_at)}` : 'GPS unavailable'}</strong>{gps && <small>Snapshot GPS age: {gps.gps_age_ms_at_snapshot == null ? 'unknown' : `${gps.gps_age_ms_at_snapshot} ms`}; receipt time is not fix time.</small>}</div>
          <div><small>Altitude</small><strong>{r.altitude_valid === true ? value(r.altitude_m, 'm') : 'Unavailable'}</strong></div>
          <div><small>Speed</small><strong>{r.speed_valid === true ? value(r.speed_kmph, 'km/h') : 'Unavailable'}</strong></div>
          <div><small>Impact / rollover</small><strong>{r.crash_alert === true || r.impact_candidate === true || r.suspected_rollover === true ? 'Possible impact / rollover — verify' : r.crash_alert === false ? 'No alert reported' : 'Unknown'}</strong></div>
          <div><small>Detector</small><strong>{r.sensor_fresh === true && r.detector_armed === true ? 'Armed · sensor fresh' : 'Detector not ready'}</strong></div>
          <div><small>Gateway signal</small><strong>{r.gateway_id || 'Unavailable'} · {value(r.rssi_dbm, 'dBm')} · {value(r.snr_db, 'dB')}</strong></div>
          <div><small>Battery</small><strong>{value(r.battery_percentage, '%')}</strong></div>
        </div>
        {r.message_type !== 'periodic' && <p>Event snapshots can be queued and may describe an older position.</p>}
        {warnings.length > 0 && <div><strong>Device warnings</strong><ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>}
        <details><summary>Recent uplinks ({view?.history.length || 0})</summary><ul>{view?.history.map((item, i) => <li key={i}>{new Date(item.received_at).toLocaleString()} · {item.message_type || 'Unknown type'} · {item.crash_alert ? 'Possible impact / rollover' : 'Telemetry'}</li>)}</ul></details>
      </>}
    </div>
  </section>;
}
