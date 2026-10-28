import pg from 'pg';

// A small per-instance pool; use a provider's pooled endpoint on Vercel.
let pool;
export function getPool() {
  if (!process.env.DATABASE_URL) throw Object.assign(new Error('DATABASE_URL is required'), { code: 'DATABASE_URL_MISSING' });
  return pool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: true,
  });
}
