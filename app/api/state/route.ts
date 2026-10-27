import { readSession, updateSession, sessionId, SessionError } from '../../../db/sessions.ts';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
function failure(error: unknown) {
  return Response.json({ error: error instanceof SessionError ? error.message : 'Shared sessions are temporarily unavailable. Please retry.' },
    { status: error instanceof SessionError ? error.status : 503, headers });
}
export async function GET(req: Request) {
  try {
    return Response.json(await readSession(sessionId(req.headers.get('X-Raahi-Session') || '')), { headers });
  } catch (error) { return failure(error); }
}
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin)
    return Response.json({ error: 'Invalid origin' }, { status: 403, headers });
  try {
    if (Number(req.headers.get('content-length')) > 8192)
      throw new SessionError('Request too large', 413);
    // Bound streamed bodies too, even if Content-Length is absent or incorrect.
    const reader = req.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8192) { await reader.cancel(); throw new SessionError('Request too large', 413); }
        chunks.push(value);
      }
    }
    let action: unknown;
    try { action = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new SessionError('Invalid JSON', 400); }
    return Response.json(await updateSession(sessionId(req.headers.get('X-Raahi-Session') || ''), action), { headers });
  } catch (error) { return failure(error); }
}
