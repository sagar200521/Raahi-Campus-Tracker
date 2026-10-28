import { authorized, configured, parseUplink, TtnError } from '../../../ttn.ts';
import { storeUplink } from '../../../../db/ttn.ts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
export async function POST(req: Request) {
  try {
    const config = configured();
    if (!authorized(req.headers.get('authorization'), config.secret)) throw new TtnError('Unauthorized', 401);
    const max = 65536;
    if (Number(req.headers.get('content-length')) > max) throw new TtnError('Request too large', 413);
    const reader = req.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); throw new TtnError('Request too large', 413); }
      chunks.push(value);
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new TtnError('Invalid JSON'); }
    const parsed = parseUplink(body, config);
    if ('ignored' in parsed) return Response.json({ ok: true, status: 'ignored', reason: parsed.ignored }, { headers });
    const status = await storeUplink(parsed.delivery_id, parsed.record);
    console.info(JSON.stringify({ event: 'ttn_uplink', status, simulated: parsed.record.simulated }));
    return Response.json({ ok: true, status, device_id: parsed.record.device_id }, { headers });
  } catch (error) {
    const status = error instanceof TtnError ? error.status : 503;
    console.warn(JSON.stringify({ event: 'ttn_uplink_failed', status }));
    return Response.json({ error: error instanceof TtnError ? error.message : 'Telemetry storage temporarily unavailable' }, { status, headers });
  }
}
