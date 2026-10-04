import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const tracker = sqliteTable("tracker", { id: integer("id").primaryKey(), data: text("data").notNull(), revision: integer("revision").notNull().default(0) });
