import { randomUUID } from 'node:crypto';
import { authorized, configured, parseUplink, TtnError } from '../../../ttn.ts';
import { errorCode } from '../../../ttn-logging.ts';
import { storeUplink } from '../../../../db/ttn.ts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  const request_id = randomUUID();
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': request_id };
  let application_id: string | null = null, device_id: string | null = null;
  let stage = 'configuration';
  try {
    const config = configured();
    stage = 'authentication';
    if (!authorized(req.headers.get('authorization'), config.secret)) throw new TtnError('Unauthorized', 401, 'TTN_AUTH_FAILED');
    stage = 'request';
    const max = 65536;
    if (Number(req.headers.get('content-length')) > max) throw new TtnError('Request too large', 413, 'TTN_BODY_TOO_LARGE');
    const reader = req.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); throw new TtnError('Request too large', 413, 'TTN_BODY_TOO_LARGE'); }
      chunks.push(value);
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new TtnError('Invalid JSON', 400, 'TTN_JSON_INVALID'); }
    // Log only configured allowlist identities after successful authentication.
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const ids = (body as { end_device_ids?: { device_id?: unknown; application_ids?: { application_id?: unknown } } }).end_device_ids;
      const app = ids?.application_ids?.application_id, device = ids?.device_id;
      if (app === config.application) application_id = config.application;
      if (typeof device === 'string' && config.devices.includes(device)) device_id = device;
    }
    stage = 'validation';
    const parsed = parseUplink(body, config);
    if ('ignored' in parsed) return Response.json({ ok: true, status: 'ignored', reason: parsed.ignored }, { headers });
    stage = 'persistence';
    const status = await storeUplink(parsed.delivery_id, parsed.record);
    console.info(JSON.stringify({ event: 'ttn_uplink', request_id, application_id, device_id, status, simulated: parsed.record.simulated }));
    return Response.json({ ok: true, status, device_id: parsed.record.device_id }, { headers });
  } catch (error) {
    const status = error instanceof TtnError ? error.status : 503;
    console.warn(JSON.stringify({ event: 'ttn_uplink_failed', request_id, application_id, device_id, stage, reason_code: errorCode(error), status }));
    return Response.json({ error: error instanceof TtnError ? error.message : 'Telemetry storage temporarily unavailable' }, { status, headers });
  }
}
