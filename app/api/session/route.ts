import { createSession } from '../../../db/sessions.ts';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin)
    return Response.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    return Response.json({ key: await createSession() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Shared sessions are temporarily unavailable. Please retry.' }, { status: 503 });
  }
}
