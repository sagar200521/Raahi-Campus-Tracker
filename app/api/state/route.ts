import { env } from "cloudflare:workers";
import { hash } from "../session/route";
import { transition } from "../../fleet";
export const dynamic = "force-dynamic";
async function session(req: Request) {
  const key = req.headers.get("X-Raahi-Session") || "";
  if (!/^[a-zA-Z0-9-]{64,100}$/.test(key))
    throw new Error("Open or create a shared demo session");
  const id = await hash(key);
  const row = await env
    .DB!.prepare("SELECT * FROM demo_sessions WHERE id=? AND expires>?")
    .bind(id, Date.now())
    .first<any>();
  if (!row) throw new Error("This demo session has expired or does not exist");
  return { id, row };
}
export async function GET(req: Request) {
  try {
    const { row } = await session(req);
    return Response.json(
      {
        state: JSON.parse(row.state),
        version: row.version,
        expires: row.expires,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 401 });
  }
}
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  try {
    if (Number(req.headers.get("content-length")) > 8192)
      return Response.json({ error: "Request too large" }, { status: 413 });
    const raw = await req.text();
    if (raw.length > 8192)
      return Response.json({ error: "Request too large" }, { status: 413 });
    const b = JSON.parse(raw);
    for (let i = 0; i < 4; i++) {
      const { id, row } = await session(req);
      const state = transition(JSON.parse(row.state), b);
      const result = await env
        .DB!.prepare(
          "UPDATE demo_sessions SET state=?,version=version+1 WHERE id=? AND version=?",
        )
        .bind(JSON.stringify(state), id, row.version)
        .run();
      if (result.meta.changes)
        return Response.json(
          { state, version: row.version + 1, expires: row.expires },
          { headers: { "Cache-Control": "no-store" } },
        );
    }
    return Response.json(
      { error: "Another update is in progress. Please retry." },
      { status: 409 },
    );
  } catch (e: any) {
    return Response.json(
      { error: e.message || "Unable to update demo session" },
      { status: 400 },
    );
  }
}
