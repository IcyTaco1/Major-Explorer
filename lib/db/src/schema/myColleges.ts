import { pgTable, text, serial, date, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const APPLICATION_STATUSES = [
  "not_applied",
  "applied",
  "interviewed",
  "accepted",
  "rejected",
  "waitlisted",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const myCollegesTable = pgTable(
  "my_colleges",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    major: text("major").notNull(),
    collegeName: text("college_name").notNull(),
    applicationStatus: text("application_status").notNull().default("not_applied"),
    notes: text("notes").notNull().default(""),
    earlyDecisionDeadline: date("early_decision_deadline", { mode: "string" }),
    regularDecisionDeadline: date("regular_decision_deadline", { mode: "string" }),
    fafsaDeadline: date("fafsa_deadline", { mode: "string" }),
    collegeData: jsonb("college_data"),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("my_colleges_user_major_college_unique").on(table.userId, table.major, table.collegeName)],
);

export const insertMyCollegeSchema = createInsertSchema(myCollegesTable).omit({
  id: true,
  savedAt: true,
});
export type InsertMyCollege = z.infer<typeof insertMyCollegeSchema>;
export type MyCollegeRow = typeof myCollegesTable.$inferSelect;
