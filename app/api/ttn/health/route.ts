import { randomUUID } from 'node:crypto';
import { configured } from '../../../ttn.ts';
import { errorCode } from '../../../ttn-logging.ts';
import { telemetryReady } from '../../../../db/ttn.ts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  const request_id = randomUUID();
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': request_id };
  let stage = 'configuration';
  try {
    configured();
    stage = 'database';
    if (!(await telemetryReady())) throw Object.assign(new Error('Schema unavailable'), { code: 'TTN_SCHEMA_MISSING' });
    return Response.json({ ready: true }, { headers });
  } catch (error) {
    console.warn(JSON.stringify({ event: 'ttn_health_failed', request_id, stage, reason_code: errorCode(error) }));
    return Response.json({ ready: false }, { status: 503, headers });
  }
}
