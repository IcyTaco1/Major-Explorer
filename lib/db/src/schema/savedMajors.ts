import { pgTable, text, serial, jsonb, timestamp, unique } from "drizzle-orm/pg-core";

// A saved college is a College snapshot plus the time it was bookmarked.
export interface SavedCollegeSnapshot {
  rank: number;
  name: string;
  location: string;
  highlights: string;
  savedAt: number;
  [key: string]: unknown;
}

export const savedMajorsTable = pgTable(
  "saved_majors",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    majorName: text("major_name").notNull(),
    description: text("description").notNull().default(""),
    // Real BLS career snapshot captured at save time (CareerInfo | null).
    career: jsonb("career"),
    // Ordered list of the colleges the user bookmarked under this major.
    colleges: jsonb("colleges").$type<SavedCollegeSnapshot[]>().notNull().default([]),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("saved_majors_user_major_unique").on(table.userId, table.majorName)],
);

export type SavedMajorRow = typeof savedMajorsTable.$inferSelect;
