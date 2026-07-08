import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, userProfilesTable } from "@workspace/db";
import { UpdateMeBody } from "@workspace/api-zod";
import { requireAuth, authUserId } from "../middlewares/requireAuth";
import { getClerkUserInfo, isAdminUser } from "../lib/clerkUsers";
import { ensureProfile } from "../lib/userProfile";

const router: IRouter = Router();

async function buildMeResponse(userId: string) {
  const [info, isAdmin] = await Promise.all([
    getClerkUserInfo(userId).catch(() => null),
    isAdminUser(userId).catch(() => false),
  ]);
  await ensureProfile(userId, info?.primaryEmail);
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));
  return {
    userId,
    email: info?.primaryEmail ?? profile?.email ?? null,
    gradeLevel: profile?.gradeLevel ?? null,
    isAdmin,
  };
}

router.get("/me", requireAuth, async (req, res) => {
  try {
    res.json(await buildMeResponse(authUserId(req)));
  } catch (err) {
    req.log.error({ err }, "getMe failed");
    res.status(500).json({ error: "Failed to load profile" });
  }
});

router.put("/me", requireAuth, async (req, res) => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid profile update" });
    return;
  }
  const userId = authUserId(req);
  try {
    const info = await getClerkUserInfo(userId).catch(() => null);
    await ensureProfile(userId, info?.primaryEmail);
    if (parsed.data.gradeLevel !== undefined) {
      await db
        .update(userProfilesTable)
        .set({ gradeLevel: parsed.data.gradeLevel ?? null })
        .where(eq(userProfilesTable.clerkUserId, userId));
    }
    res.json(await buildMeResponse(userId));
  } catch (err) {
    req.log.error({ err }, "updateMe failed");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
