import { pgTable, text, integer, timestamp, doublePrecision, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface QuizResultItem {
  major: string;
  reason: string;
}

export const userProfilesTable = pgTable("user_profiles", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  email: text("email"),
  gradeLevel: integer("grade_level"),
  gpa: doublePrecision("gpa"),
  sat: integer("sat"),
  act: integer("act"),
  goals: text("goals"),
  quizResults: jsonb("quiz_results").$type<QuizResultItem[]>(),
  quizDone: boolean("quiz_done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfilesTable).omit({
  createdAt: true,
  lastSeenAt: true,
});
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfilesTable.$inferSelect;
