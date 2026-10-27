import 'server-only';
import { drizzle } from 'drizzle-orm/node-postgres';
import { getPool } from './postgres.mjs';
import * as schema from './schema';

export function getDb() {
  return drizzle(getPool(), { schema });
}
