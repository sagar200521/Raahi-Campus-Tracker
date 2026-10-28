import { createHash, timingSafeEqual } from 'node:crypto';

type Obj = Record<string, unknown>;
export class TtnError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = 'TTN_REQUEST_INVALID') { super(message); this.status = status; this.code = code; }
}
function object(value: unknown, field: string): Obj {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TtnError(`Invalid ${field}`);
  return value as Obj;
}
function str(value: unknown, field: string, required = false, max = 256): string | null {
  if (value == null && !required) return null;
  if (typeof value !== 'string' || !value.length || value.length > max) throw new TtnError(`Invalid ${field}`);
  return value;
}
function number(value: unknown, field: string, min: number, max: number, integer = false): number | null {
  if (value == null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isSafeInteger(value))) throw new TtnError(`Invalid ${field}`);
  return value;
}
function bool(value: unknown, field: string): boolean | null {
  if (value == null) return null;
  if (typeof value !== 'boolean') throw new TtnError(`Invalid ${field}`);
  return value;
}
export function configured() {
  const secret = process.env.TTN_WEBHOOK_SECRET;
  const application = process.env.TTN_ALLOWED_APPLICATION_ID;
  const devices = (process.env.TTN_ALLOWED_DEVICE_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!secret || !application || !devices.length) throw new TtnError('Webhook is not configured', 503, 'TTN_CONFIG_MISSING');
  return { secret, application, devices };
}
export function authorized(header: string | null, secret: string) {
  const match = /^Bearer ([^\s]+)$/i.exec(header || '');
  // Hashing to fixed-length values makes timingSafeEqual safe even for different lengths.
  const digest = (s: string) => createHash('sha256').update(s).digest();
  return !!match && timingSafeEqual(digest(match[1]), digest(secret));
}
export function parseUplink(input: unknown, allowed: { application: string; devices: string[] }, now = new Date()) {
  const root = object(input, 'body');
  const ids = object(root.end_device_ids, 'end_device_ids');
  const app = object(ids.application_ids, 'application_ids');
  const application_id = str(app.application_id, 'application_id', true, 128)!;
  const device_id = str(ids.device_id, 'device_id', true, 128)!;
  if (application_id !== allowed.application || !allowed.devices.includes(device_id)) throw new TtnError('Device or application not allowed', 403);
  if (root.uplink_message == null) return { ignored: 'not an uplink' } as const;
  const uplink = object(root.uplink_message, 'uplink_message');
  const port = number(uplink.f_port, 'f_port', 0, 255, true);
  if (port === null) throw new TtnError('Missing f_port');
  if (port !== 2) return { ignored: 'unsupported port' } as const;
  const session = str(uplink.session_key_id, 'session_key_id', true, 512)!;
  const counter = number(uplink.f_cnt, 'f_cnt', 0, 4294967295, true);
  if (counter === null) throw new TtnError('Missing f_cnt');
  const received_at = str(root.received_at, 'received_at', true, 64)!;
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(received_at) || !Number.isFinite(Date.parse(received_at))) throw new TtnError('Invalid received_at');
  const d = uplink.decoded_payload == null ? {} : object(uplink.decoded_payload, 'decoded_payload');
  const warnings = uplink.decoded_payload_warnings == null ? [] : uplink.decoded_payload_warnings;
  if (!Array.isArray(warnings) || warnings.length > 50 || warnings.some(x => typeof x !== 'string' || x.length > 512)) throw new TtnError('Invalid decoder warnings');
  const decoder_warnings: string[] = [...warnings];
  if (uplink.decoded_payload == null) decoder_warnings.push('Decoder output unavailable');
  const version = number(d.payload_version, 'payload_version', 0, 255, true);
  if (version !== null && version !== 1) return { ignored: 'unsupported payload version' } as const;
  const simulated = bool(root.simulated, 'simulated') ?? false;
  const rawGateways = uplink.rx_metadata == null ? [] : uplink.rx_metadata;
  if (!Array.isArray(rawGateways) || rawGateways.length > 100) throw new TtnError('Invalid rx_metadata');
  // Deterministic choice: lexicographically smallest gateway ID, then strongest RSSI/SNR.
  const gateways = rawGateways.map((v: unknown) => {
    const g = object(v, 'gateway');
    const gid = g.gateway_ids == null ? null : str(object(g.gateway_ids, 'gateway_ids').gateway_id, 'gateway_id', false, 128);
    return { gateway_id: gid, rssi_dbm: number(g.rssi, 'rssi', -300, 100), snr_db: number(g.snr, 'snr', -100, 100) };
  }).sort((a, b) => (a.gateway_id ?? '\uffff').localeCompare(b.gateway_id ?? '\uffff') || (b.rssi_dbm ?? -Infinity) - (a.rssi_dbm ?? -Infinity) || (b.snr_db ?? -Infinity) - (a.snr_db ?? -Infinity));
  const dev_eui = str(ids.dev_eui, 'dev_eui', false, 16);
  if (dev_eui && !/^[0-9a-f]{16}$/i.test(dev_eui)) throw new TtnError('Invalid dev_eui');
  const lastBattery = uplink.last_battery_percentage == null ? null : object(uplink.last_battery_percentage, 'last_battery_percentage');
  const record = {
    schema_version: 1, payload_version: version, application_id, device_id, dev_eui,
    received_at, ingested_at: now.toISOString(), frame_counter: counter,
    sequence: number(d.sequence, 'sequence', 0, 4294967295, true),
    message_type: str(d.message_type, 'message_type', false, 64),
    snapshot_uptime_ms: number(d.snapshot_uptime_ms, 'snapshot_uptime_ms', 0, Number.MAX_SAFE_INTEGER, true),
    latitude: number(d.latitude, 'latitude', -90, 90), longitude: number(d.longitude, 'longitude', -180, 180),
    altitude_m: number(d.altitude_m, 'altitude_m', -15000, 100000), speed_kmph: number(d.speed_kmph, 'speed_kmph', 0, 2000),
    crash_status_code: number(d.crash_status_code, 'crash_status_code', 0, 255, true), crash_status: str(d.crash_status, 'crash_status', false, 128),
    crash_alert: bool(d.crash_alert, 'crash_alert'), impact_candidate: bool(d.impact_candidate, 'impact_candidate'), suspected_rollover: bool(d.suspected_rollover, 'suspected_rollover'),
    gps_valid: bool(d.gps_valid, 'gps_valid'), altitude_valid: bool(d.altitude_valid, 'altitude_valid'), speed_valid: bool(d.speed_valid, 'speed_valid'),
    gps_age_ms_at_snapshot: number(d.gps_age_ms_at_snapshot, 'gps_age_ms_at_snapshot', 0, Number.MAX_SAFE_INTEGER, true),
    sensor_fresh: bool(d.sensor_fresh, 'sensor_fresh'), detector_armed: bool(d.detector_armed, 'detector_armed'), sensor_clipped: bool(d.sensor_clipped, 'sensor_clipped'), fifo_warning: bool(d.fifo_warning, 'fifo_warning'), event_queue_overflow: bool(d.event_queue_overflow, 'event_queue_overflow'),
    decoder_warnings, ...(gateways[0] || { gateway_id: null, rssi_dbm: null, snr_db: null }),
    diagnostic_warnings: (d.sensor_fresh === false || d.detector_armed === false) ? ['Detector not ready: sensor is stale or detector is not armed.'] : [],
    battery_percentage: number(lastBattery?.value ?? d.battery_percentage ?? root.battery_percentage, 'battery_percentage', 0, 100), simulated,
  };
  const delivery_id = createHash('sha256').update(JSON.stringify([application_id, device_id, session, counter])).digest('hex');
  return { record, delivery_id } as const;
}
export type TtnRecord = Extract<ReturnType<typeof parseUplink>, { record: unknown }>['record'];
