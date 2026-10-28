import { GET as readTelemetry } from '../vehicles/[deviceId]/telemetry/route';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(req: Request) {
  return readTelemetry(req, { params: Promise.resolve({ deviceId: 'raahi-vt' }) });
}
