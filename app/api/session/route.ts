import { env } from "cloudflare:workers";
import { initialState } from "../../fleet";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const key = crypto.randomUUID() + crypto.randomUUID();
    const id = await hash(key);
    await env
      .DB!.prepare(
        "INSERT INTO demo_sessions (id,state,version,expires) VALUES (?,?,0,?)",
      )
      .bind(id, JSON.stringify(initialState()), Date.now() + 7 * 86400000)
      .run();
    return Response.json({ key }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "Shared sessions are temporarily unavailable. Please retry." },
      { status: 503 },
    );
  }
}
export async function hash(key: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
