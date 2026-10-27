import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  out: './db/migrations/generated-postgres',
  schema: './db/schema.ts',
  dialect: 'postgresql',
});
