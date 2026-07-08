import { Router, type IRouter, type RequestHandler } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { count, eq, gt, sql } from "drizzle-orm";
import { db, userProfilesTable, myCollegesTable } from "@workspace/db";
import { isAdminUser } from "../lib/clerkUsers";

const router: IRouter = Router();

const requireAdmin: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  try {
    if (!(await isAdminUser(userId))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  } catch (err) {
    req.log.error({ err }, "admin check failed");
    res.status(500).json({ error: "Admin check failed" });
  }
};

router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [
      totalUsersRows,
      activeRows,
      totalCollegesRows,
      grades,
      majors,
      colleges,
      statuses,
    ] = await Promise.all([
      db.select({ value: count() }).from(userProfilesTable),
      db
        .select({ value: count() })
        .from(userProfilesTable)
        .where(gt(userProfilesTable.lastSeenAt, weekAgo)),
      db.select({ value: count() }).from(myCollegesTable),
      db
        .select({ gradeLevel: userProfilesTable.gradeLevel, count: count() })
        .from(userProfilesTable)
        .groupBy(userProfilesTable.gradeLevel),
      db
        .select({ label: myCollegesTable.major, count: count() })
        .from(myCollegesTable)
        .groupBy(myCollegesTable.major)
        .orderBy(sql`count(*) desc`)
        .limit(10),
      db
        .select({ label: myCollegesTable.collegeName, count: count() })
        .from(myCollegesTable)
        .groupBy(myCollegesTable.collegeName)
        .orderBy(sql`count(*) desc`)
        .limit(10),
      db
        .select({ label: myCollegesTable.applicationStatus, count: count() })
        .from(myCollegesTable)
        .groupBy(myCollegesTable.applicationStatus),
    ]);
    res.json({
      totalUsers: totalUsersRows[0]?.value ?? 0,
      activeLast7Days: activeRows[0]?.value ?? 0,
      totalSavedColleges: totalCollegesRows[0]?.value ?? 0,
      gradeDistribution: grades,
      topMajors: majors,
      topColleges: colleges,
      statusCounts: statuses,
    });
  } catch (err) {
    req.log.error({ err }, "getAdminStats failed");
    res.status(500).json({ error: "Failed to load statistics" });
  }
});

router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const [clerkUsers, profiles, collegeCounts] = await Promise.all([
      clerkClient.users.getUserList({ limit: 500, orderBy: "-created_at" }),
      db.select().from(userProfilesTable),
      db
        .select({ userId: myCollegesTable.userId, count: count() })
        .from(myCollegesTable)
        .groupBy(myCollegesTable.userId),
    ]);
    const profileMap = new Map(profiles.map((p) => [p.clerkUserId, p]));
    const countMap = new Map(collegeCounts.map((c) => [c.userId, c.count]));

    interface AdminUserOut {
      userId: string;
      email: string | null;
      name: string | null;
      gradeLevel: number | null;
      savedCollegeCount: number;
      createdAt: string | null;
      lastSeenAt: string | null;
    }

    const users: AdminUserOut[] = clerkUsers.data.map((u) => {
      const profile = profileMap.get(u.id);
      return {
        userId: u.id,
        email:
          u.primaryEmailAddress?.emailAddress ??
          u.emailAddresses[0]?.emailAddress ??
          profile?.email ??
          null,
        name: [u.firstName, u.lastName].filter(Boolean).join(" ") || null,
        gradeLevel: profile?.gradeLevel ?? null,
        savedCollegeCount: countMap.get(u.id) ?? 0,
        createdAt: new Date(u.createdAt).toISOString(),
        lastSeenAt: profile?.lastSeenAt?.toISOString() ?? null,
      };
    });

    const clerkIds = new Set(clerkUsers.data.map((u) => u.id));
    for (const profile of profiles) {
      if (clerkIds.has(profile.clerkUserId)) continue;
      users.push({
        userId: profile.clerkUserId,
        email: profile.email,
        name: null,
        gradeLevel: profile.gradeLevel,
        savedCollegeCount: countMap.get(profile.clerkUserId) ?? 0,
        createdAt: profile.createdAt.toISOString(),
        lastSeenAt: profile.lastSeenAt.toISOString(),
      });
    }

    res.json(users);
  } catch (err) {
    req.log.error({ err }, "listAdminUsers failed");
    res.status(500).json({ error: "Failed to load users" });
  }
});

export default router;
