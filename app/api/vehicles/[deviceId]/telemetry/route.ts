import { getPool } from '../../../../../db/postgres.mjs';
import { readSession, sessionId, SessionError } from '../../../../../db/sessions.ts';
import { configured } from '../../../../ttn.ts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
export async function GET(req: Request, { params }: { params: Promise<{ deviceId: string }> }) {
  try {
    // A demo session is a bearer link, not an account or proof of device ownership.
    await readSession(sessionId(req.headers.get('X-Raahi-Session') || ''));
    const { application, devices } = configured();
    const { deviceId } = await params;
    if (!devices.includes(deviceId)) return Response.json({ error: 'Device unavailable' }, { status: 404, headers });
    const u = new URL(req.url), rawLimit = u.searchParams.get('limit') || '50';
    if (!/^\d+$/.test(rawLimit) || +rawLimit < 1 || +rawLimit > 100) return Response.json({ error: 'Invalid limit' }, { status: 400, headers });
    const simulated = u.searchParams.get('simulated') === 'true';
    const [latest, history] = await Promise.all([
      getPool().query('SELECT latest_record, last_gps_record FROM public.ttn_device_latest WHERE application_id=$1 AND device_id=$2 AND simulated=$3', [application, deviceId, simulated]),
      getPool().query('SELECT record FROM public.ttn_telemetry WHERE application_id=$1 AND device_id=$2 AND simulated=$3 ORDER BY received_at DESC, delivery_id DESC LIMIT $4', [application, deviceId, simulated, +rawLimit]),
    ]);
    return Response.json({ simulated, latest: latest.rows[0]?.latest_record ?? null, last_known_gps: latest.rows[0]?.last_gps_record ?? null, history: history.rows.map((r: { record: unknown }) => r.record) }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof SessionError ? error.message : 'Telemetry temporarily unavailable' }, { status: error instanceof SessionError ? error.status : 503, headers });
  }
}
