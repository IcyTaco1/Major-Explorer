import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";
import { sql, lt } from "drizzle-orm";
import { db, rateLimitCountersTable } from "@workspace/db";

interface RateLimitOptions {
  /** Distinguishes limiter buckets (e.g. "chat" vs "lookup"). */
  name: string;
  /** Time window in milliseconds. */
  windowMs: number;
  /** Max requests allowed per key within the window. */
  max: number;
}

/**
 * Postgres-backed fixed-window rate limiter keyed by Clerk userId (falls back
 * to IP for unauthenticated requests). Backing it in the DB keeps counts
 * accurate across server restarts, so a limit can't be bypassed by triggering
 * a restart. Fixed-window allows up to ~2x burst at a window boundary, an
 * acceptable tradeoff for cost control.
 *
 * On a DB error the limiter fails OPEN (allows the request and logs) so a
 * transient DB blip can't take down all AI features.
 */
export function rateLimit({ name, windowMs, max }: RateLimitOptions): RequestHandler {
  return (req, res, next) => {
    void (async () => {
      const { userId } = getAuth(req);
      const key = userId ?? `ip:${req.ip ?? "unknown"}`;
      const now = Date.now();
      const windowIndex = Math.floor(now / windowMs);
      const windowEnd = (windowIndex + 1) * windowMs;
      const bucketKey = `${name}:${key}:${windowIndex}`;

      // Occasionally sweep expired rows; cheap and needs no timer lifecycle.
      if (Math.random() < 0.02) {
        db.delete(rateLimitCountersTable)
          .where(lt(rateLimitCountersTable.expiresAt, new Date(now)))
          .catch((err) => req.log.warn({ err }, "rateLimit cleanup failed"));
      }

      try {
        const [row] = await db
          .insert(rateLimitCountersTable)
          .values({
            bucketKey,
            count: 1,
            // Keep the row one extra window past its end for lazy cleanup.
            expiresAt: new Date(windowEnd + windowMs),
          })
          .onConflictDoUpdate({
            target: rateLimitCountersTable.bucketKey,
            set: { count: sql`${rateLimitCountersTable.count} + 1` },
          })
          .returning({ count: rateLimitCountersTable.count });

        if (row && row.count > max) {
          const retryAfterSec = Math.max(Math.ceil((windowEnd - now) / 1000), 1);
          res.setHeader("Retry-After", String(retryAfterSec));
          res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
          return;
        }
        next();
      } catch (err) {
        // Fail open: never let a DB issue block legitimate traffic.
        req.log.error({ err }, "rateLimit check failed; allowing request");
        next();
      }
    })();
  };
}
