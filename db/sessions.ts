import { createHash, randomUUID } from 'node:crypto';
import { getPool } from './postgres.mjs';
import { initialState, transition } from '../app/fleet.ts';

export class SessionError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export function hash(key: string) {
  return createHash('sha256').update(key).digest('hex');
}
export function sessionId(key: string) {
  if (!/^[a-zA-Z0-9-]{64,100}$/.test(key))
    throw new SessionError('Open or create a shared demo session', 401);
  return hash(key);
}
export async function createSession() {
  const key = randomUUID() + randomUUID();
  await getPool().query(
    'INSERT INTO demo_sessions (id,state,version,expires) VALUES ($1,$2,0,$3)',
    [hash(key), JSON.stringify(initialState()), Date.now() + 7 * 86400000],
  );
  return key;
}
export async function readSession(id: string) {
  const { rows } = await getPool().query(
    'SELECT state,version,expires FROM demo_sessions WHERE id=$1 AND expires>$2',
    [id, Date.now()],
  );
  if (!rows[0]) throw new SessionError('This demo session has expired or does not exist', 401);
  return { state: rows[0].state, version: rows[0].version as number, expires: Number(rows[0].expires) };
}
export async function updateSession(id: string, action: unknown) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await readSession(id);
    let state;
    try { state = transition(row.state, action); }
    catch (error) { throw new SessionError(error instanceof Error ? error.message : 'Invalid action', 400); }
    const { rowCount } = await getPool().query(
      'UPDATE demo_sessions SET state=$1,version=version+1 WHERE id=$2 AND version=$3 AND expires>$4',
      [JSON.stringify(state), id, row.version, Date.now()],
    );
    if (rowCount === 1) return { state, version: row.version + 1, expires: row.expires };
    // Reload and rerun the reducer: never retry a state computed from an old version.
  }
  throw new SessionError('Another update is in progress. Please retry.', 409);
}
