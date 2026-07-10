import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

// Fixed-window rate-limit counters. One row per (limiter name, principal,
// window index). Backing the limiter in Postgres keeps it accurate across
// server restarts so limits can't be reset by triggering a restart.
export const rateLimitCountersTable = pgTable("rate_limit_counters", {
  // `${name}:${principal}:${windowIndex}`
  bucketKey: text("bucket_key").primaryKey(),
  count: integer("count").notNull().default(0),
  // When this window's row is safe to delete (opportunistically cleaned up).
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type RateLimitCounterRow = typeof rateLimitCountersTable.$inferSelect;
