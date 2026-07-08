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
    gpa: profile?.gpa ?? null,
    sat: profile?.sat ?? null,
    act: profile?.act ?? null,
    goals: profile?.goals ?? "",
    quizResults: profile?.quizResults ?? [],
    quizDone: profile?.quizDone ?? false,
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
    const d = parsed.data;
    const updates: Record<string, unknown> = {};
    if (d.gradeLevel !== undefined) updates.gradeLevel = d.gradeLevel ?? null;
    if (d.gpa !== undefined) updates.gpa = d.gpa ?? null;
    if (d.sat !== undefined) updates.sat = d.sat ?? null;
    if (d.act !== undefined) updates.act = d.act ?? null;
    if (d.goals !== undefined) updates.goals = d.goals;
    if (d.quizResults !== undefined) updates.quizResults = d.quizResults;
    if (d.quizDone !== undefined) updates.quizDone = d.quizDone;
    if (Object.keys(updates).length > 0) {
      await db
        .update(userProfilesTable)
        .set(updates)
        .where(eq(userProfilesTable.clerkUserId, userId));
    }
    res.json(await buildMeResponse(userId));
  } catch (err) {
    req.log.error({ err }, "updateMe failed");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
