import { pgTable, text, serial, date, timestamp, jsonb } from "drizzle-orm/pg-core";

// Cached per-college application deadlines fetched from official sources via
// AI web search. Keyed by a normalized college name so every user shares the
// same cached lookup instead of re-paying for the web search.
export const collegeDeadlinesTable = pgTable("college_deadlines", {
  id: serial("id").primaryKey(),
  collegeKey: text("college_key").notNull().unique(),
  collegeName: text("college_name").notNull(),
  cycle: text("cycle").notNull().default(""),
  earlyDecision: date("early_decision", { mode: "string" }),
  regularDecision: date("regular_decision", { mode: "string" }),
  fafsa: date("fafsa", { mode: "string" }),
  notes: text("notes").notNull().default(""),
  sources: jsonb("sources"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CollegeDeadlinesRow = typeof collegeDeadlinesTable.$inferSelect;
