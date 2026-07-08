import { clerkClient } from "@clerk/express";

export interface ClerkUserInfo {
  emails: string[];
  primaryEmail: string | null;
  name: string | null;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { info: ClerkUserInfo; at: number }>();

export async function getClerkUserInfo(userId: string): Promise<ClerkUserInfo> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.info;

  const user = await clerkClient.users.getUser(userId);
  const emails = user.emailAddresses.map((e) => e.emailAddress.toLowerCase());
  const primaryEmail =
    user.primaryEmailAddress?.emailAddress?.toLowerCase() ?? emails[0] ?? null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;

  const info: ClerkUserInfo = { emails, primaryEmail, name };
  cache.set(userId, { info, at: Date.now() });
  return info;
}

export function getAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const admins = getAdminEmails();
  if (admins.size === 0) return false;
  const info = await getClerkUserInfo(userId);
  return info.emails.some((e) => admins.has(e));
}
