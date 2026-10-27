import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPool } from '../db/postgres.mjs';
import { createSession, hash, readSession, updateSession } from '../db/sessions.ts';
import { POST as create } from '../app/api/session/route.ts';
import { GET, POST } from '../app/api/state/route.ts';

const pool = getPool();
const ids: string[] = [];
const url = 'http://localhost/api/state';
const data = JSON.parse(readFileSync(new URL('../public/campus.json', import.meta.url), 'utf8'));
function request(key: string, body: unknown, extra = {}) {
  return new Request(url, { method: 'POST', headers: { 'X-Raahi-Session': key, ...extra }, body: JSON.stringify(body) });
}
try {
  const response = await create(new Request('http://localhost/api/session', { method: 'POST' }));
  assert.equal(response.status, 200);
  const { key } = await response.json();
  const id = hash(key); ids.push(id);
  const secondKey = await createSession(); ids.push(hash(secondKey));
  const base = { action: 'request', vehicle: 'ER-01', pickup: data.stops[0], destination: data.stops[2], people: 1 };
  // Race independent writers on the same persisted version; both requests must survive retries.
  await Promise.all([
    updateSession(id, { ...base, id: 'request0001', student: 'student00001' }),
    updateSession(id, { ...base, id: 'request0002', student: 'student00002' }),
  ]);
  let row = await readSession(id);
  assert.equal(row.version, 2); assert.equal(row.state.rides.length, 2);
  const results = await Promise.all([
    POST(request(key, { action: 'trip', id: 'request0001', vehicle: 'ER-01', status: 'accepted' })),
    POST(request(key, { action: 'trip', id: 'request0002', vehicle: 'ER-01', status: 'accepted' })),
  ]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 400]);
  row = await readSession(id);
  assert.equal(row.state.rides.filter((r: any) => r.status === 'accepted').length, 1);
  assert.equal(row.version, 3);
  assert.equal((await readSession(hash(secondKey))).version, 0);
  const get = await GET(new Request(url, { headers: { 'X-Raahi-Session': key } }));
  assert.equal(get.headers.get('cache-control'), 'no-store');
  assert.equal((await get.json()).version, 3);
  assert.equal((await GET(new Request(url))).status, 401);
  assert.equal((await POST(request(key, {}, { origin: 'https://other.example' }))).status, 403);
  assert.equal((await create(new Request('http://localhost/api/session', { method: 'POST', headers: { origin: 'https://other.example' } }))).status, 403);
  assert.equal((await POST(new Request(url, { method: 'POST', body: '{' }))).status, 400);
  assert.equal((await POST(new Request(url, { method: 'POST', body: 'x'.repeat(8193) }))).status, 413);
  // Expiry is checked on the write itself, even if it expires after the read.
  await pool.query('UPDATE demo_sessions SET expires=$1 WHERE id=$2', [Date.now() - 1, id]);
  const write = await pool.query('UPDATE demo_sessions SET version=version+1 WHERE id=$1 AND version=$2 AND expires>$3', [id, 3, Date.now()]);
  assert.equal(write.rowCount, 0);
  assert.equal((await GET(new Request(url, { headers: { 'X-Raahi-Session': key } }))).status, 401);
  assert.equal((await POST(request(key, { action: 'telemetry', vehicle: 'ER-01', speed: 30 }))).status, 401);
  console.log('PASS: real Postgres concurrent writes/acceptance, session isolation, persisted reads, expiry, Origin, body limits and invalid JSON');
} finally {
  for (const id of ids) await pool.query('DELETE FROM demo_sessions WHERE id=$1', [id]);
  await pool.end();
}
