import { db, userProfilesTable } from "@workspace/db";
import { logger } from "./logger";

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;
const lastTouch = new Map<string, number>();

/** Insert the profile row if missing; always bumps lastSeenAt. */
export async function ensureProfile(
  userId: string,
  email?: string | null,
): Promise<void> {
  await db
    .insert(userProfilesTable)
    .values({ clerkUserId: userId, email: email ?? null })
    .onConflictDoUpdate({
      target: userProfilesTable.clerkUserId,
      set: { lastSeenAt: new Date(), ...(email ? { email } : {}) },
    });
}

/** Throttled, fire-and-forget lastSeenAt bump. Never throws. */
export async function touchProfile(
  userId: string,
  email?: string | null,
): Promise<void> {
  const now = Date.now();
  if (now - (lastTouch.get(userId) ?? 0) < TOUCH_INTERVAL_MS) return;
  lastTouch.set(userId, now);
  try {
    await ensureProfile(userId, email);
  } catch (err) {
    logger.warn({ err }, "touchProfile failed");
  }
}
