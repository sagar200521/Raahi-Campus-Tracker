import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const sessions = sqliteTable("demo_sessions", {
  id: text("id").primaryKey(),
  state: text("state").notNull(),
  version: integer("version").notNull().default(0),
  expires: integer("expires").notNull(),
});
