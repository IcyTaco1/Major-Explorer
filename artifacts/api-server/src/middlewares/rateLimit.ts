import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

interface RateLimitOptions {
  /** Time window in milliseconds. */
  windowMs: number;
  /** Max requests allowed per key within the window. */
  max: number;
}

/**
 * Simple in-memory sliding-window rate limiter keyed by Clerk userId
 * (falls back to IP for unauthenticated requests). Suitable for a
 * single-process server; state resets on restart.
 */
export function rateLimit({ windowMs, max }: RateLimitOptions): RequestHandler {
  const hits = new Map<string, number[]>();

  // Periodically drop stale keys so the map can't grow unbounded.
  const cleanup = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, timestamps] of hits) {
      const recent = timestamps.filter((t) => t > cutoff);
      if (recent.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, recent);
      }
    }
  }, windowMs);
  cleanup.unref();

  return (req, res, next) => {
    const { userId } = getAuth(req);
    const key = userId ?? `ip:${req.ip ?? "unknown"}`;
    const now = Date.now();
    const cutoff = now - windowMs;
    const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

    if (recent.length >= max) {
      const retryAfterSec = Math.ceil((recent[0] + windowMs - now) / 1000);
      res.setHeader("Retry-After", String(Math.max(retryAfterSec, 1)));
      res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
      return;
    }

    recent.push(now);
    hits.set(key, recent);
    next();
  };
}
