export type Point = {
  lat: number;
  lng: number;
  name?: string;
  id?: string;
  source?: string;
};
export function distance(a: Point, b: Point) {
  const r = Math.PI / 180,
    x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) * r) / 2),
    y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371000;
}
export function buildGraph(data: any) {
  const nodes = new Map<number, Point>(),
    edges = new Map<number, Array<[number, number]>>();
  for (const road of data.roads) {
    for (const [id, lat, lng] of road.nodes) {
      nodes.set(id, { lat, lng });
      if (!edges.has(id)) edges.set(id, []);
    }
    for (let i = 1; i < road.nodes.length; i++) {
      const a = road.nodes[i - 1][0],
        b = road.nodes[i][0],
        d = distance(nodes.get(a)!, nodes.get(b)!);
      edges.get(a)!.push([b, d]);
      if (!road.oneway) edges.get(b)!.push([a, d]);
    }
  }
  return { nodes, edges };
}
export function roadRoute(graph: any, a: Point, b: Point) {
  if (!graph) return null;
  let start: any,
    end: any,
    ad = Infinity,
    bd = Infinity;
  for (const [id, p] of graph.nodes) {
    const da = distance(a, p),
      db = distance(b, p);
    if (da < ad) {
      ad = da;
      start = id;
    }
    if (db < bd) {
      bd = db;
      end = id;
    }
  }
  if (ad > 250 || bd > 250) return null;
  const best = new Map([[start, 0]]),
    prev = new Map(),
    todo = new Set([start]);
  while (todo.size) {
    let u: any,
      min = Infinity;
    for (const n of todo) {
      if (best.get(n)! < min) {
        u = n;
        min = best.get(n)!;
      }
    }
    todo.delete(u);
    if (u === end) break;
    for (const [v, c] of graph.edges.get(u) || []) {
      const d = min + c;
      if (d < (best.get(v) ?? Infinity)) {
        best.set(v, d);
        prev.set(v, u);
        todo.add(v);
      }
    }
  }
  if (!best.has(end)) return null;
  const path = [];
  let x = end;
  while (x !== undefined) {
    path.unshift(graph.nodes.get(x));
    if (x === start) break;
    x = prev.get(x);
  }
  return {
    path,
    meters: best.get(end)!,
    accessMeters: ad + bd,
    minutes: Math.max(1, Math.ceil(best.get(end)! / 200)),
  };
}
