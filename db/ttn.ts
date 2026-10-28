import { getPool } from './postgres.mjs';
import type { TtnRecord } from '../app/ttn.ts';

export async function storeUplink(deliveryId: string, record: TtnRecord) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      'INSERT INTO public.ttn_telemetry (delivery_id,application_id,device_id,received_at,simulated,record) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING delivery_id',
      [deliveryId, record.application_id, record.device_id, record.received_at, record.simulated, JSON.stringify(record)],
    );
    if (!inserted.rowCount) { await client.query('COMMIT'); return 'duplicate' as const; }
    // Event snapshots may be queued; do not promote them to a fresh map location.
    const gps = record.message_type === 'periodic' && record.gps_valid === true && record.latitude !== null && record.longitude !== null;
    await client.query(`INSERT INTO public.ttn_device_latest (application_id,device_id,simulated,latest_received_at,latest_record,last_gps_received_at,last_gps_record)
      VALUES ($1,$2,$3,$4,$5,CASE WHEN $6 THEN $4::timestamptz ELSE NULL END,CASE WHEN $6 THEN $5::jsonb ELSE NULL END)
      ON CONFLICT (application_id,device_id,simulated) DO UPDATE SET
        latest_record = CASE WHEN EXCLUDED.latest_received_at > ttn_device_latest.latest_received_at THEN EXCLUDED.latest_record ELSE ttn_device_latest.latest_record END,
        latest_received_at = GREATEST(ttn_device_latest.latest_received_at,EXCLUDED.latest_received_at),
        last_gps_record = CASE WHEN EXCLUDED.last_gps_received_at IS NOT NULL AND (ttn_device_latest.last_gps_received_at IS NULL OR EXCLUDED.last_gps_received_at > ttn_device_latest.last_gps_received_at) THEN EXCLUDED.last_gps_record ELSE ttn_device_latest.last_gps_record END,
        last_gps_received_at = CASE WHEN EXCLUDED.last_gps_received_at IS NOT NULL AND (ttn_device_latest.last_gps_received_at IS NULL OR EXCLUDED.last_gps_received_at > ttn_device_latest.last_gps_received_at) THEN EXCLUDED.last_gps_received_at ELSE ttn_device_latest.last_gps_received_at END`,
      [record.application_id, record.device_id, record.simulated, record.received_at, JSON.stringify(record), gps]);
    await client.query('COMMIT');
    return 'stored' as const;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}
export async function telemetryReady() {
  const { rows } = await getPool().query("SELECT to_regclass('public.ttn_telemetry') IS NOT NULL AND to_regclass('public.ttn_device_latest') IS NOT NULL AS ready");
  return rows[0]?.ready === true;
}
