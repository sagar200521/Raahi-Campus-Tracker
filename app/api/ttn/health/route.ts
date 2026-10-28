import { configured } from '../../../ttn.ts';
import { telemetryReady } from '../../../../db/ttn.ts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    configured();
    if (!(await telemetryReady())) throw new Error('Schema unavailable');
    return Response.json({ ready: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ ready: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
