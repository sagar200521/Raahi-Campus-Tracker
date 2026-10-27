import { pgTable, text, integer, bigint, jsonb } from 'drizzle-orm/pg-core';
import { initialState } from '../app/fleet';
type FleetState = ReturnType<typeof initialState>;

export const sessions = pgTable('demo_sessions', {
  id: text('id').primaryKey(),
  state: jsonb('state').$type<FleetState>().notNull(),
  version: integer('version').notNull().default(0),
  expires: bigint('expires', { mode: 'number' }).notNull(),
});
