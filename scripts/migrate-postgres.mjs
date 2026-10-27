import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import pg from 'pg';

// Use a direct connection for transaction-scoped migration locking.
const connectionString = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL or DATABASE_MIGRATION_URL is required');
const client = new pg.Client({ connectionString });
try {
  await client.connect();
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(72422501)');
  await client.query('CREATE TABLE IF NOT EXISTS raahi_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const directory = new URL('../db/migrations/postgres/', import.meta.url);
  for (const name of (await readdir(directory)).filter(n => n.endsWith('.sql')).sort()) {
    const sql = await readFile(new URL(name, directory), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const { rows } = await client.query('SELECT checksum FROM raahi_migrations WHERE name=$1', [name]);
    if (rows.length) {
      if (rows[0].checksum !== checksum) throw new Error(`Applied migration changed: ${name}`);
      continue;
    }
    await client.query(sql);
    await client.query('INSERT INTO raahi_migrations (name,checksum) VALUES ($1,$2)', [name, checksum]);
    console.log(`Applied ${name}`);
  }
  await client.query('COMMIT');
  console.log('Postgres migrations up to date');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  // Do not print connection details or credentials.
  console.error('Migration failed:', error.code || 'check database access and migration checksums');
  process.exitCode = 1;
} finally {
  await client.end();
}
