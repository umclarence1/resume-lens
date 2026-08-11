import { sql } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const evidenceProjects = sqliteTable("evidence_projects", {
  id: text("id").primaryKey(),
  passportKey: text("passport_key").notNull(),
  title: text("title").notNull(),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("evidence_projects_passport_key_idx").on(table.passportKey)]);
