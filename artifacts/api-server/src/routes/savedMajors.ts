import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  savedMajorsTable,
  type SavedMajorRow,
  type SavedCollegeSnapshot,
} from "@workspace/db";
import { UpsertSavedMajorBody, ImportSavedMajorsBody } from "@workspace/api-zod";
import { requireAuth, authUserId } from "../middlewares/requireAuth";
import { touchProfile } from "../lib/userProfile";

const router: IRouter = Router();

function toItem(row: SavedMajorRow) {
  return {
    id: row.id,
    majorName: row.majorName,
    description: row.description,
    career: row.career ?? null,
    colleges: (row.colleges ?? []) as SavedCollegeSnapshot[],
    savedAt: row.savedAt.toISOString(),
  };
}

function parseId(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get("/saved-majors", requireAuth, async (req, res) => {
  const userId = authUserId(req);
  void touchProfile(userId);
  try {
    const rows = await db
      .select()
      .from(savedMajorsTable)
      .where(eq(savedMajorsTable.userId, userId))
      .orderBy(desc(savedMajorsTable.savedAt));
    res.json(rows.map(toItem));
  } catch (err) {
    req.log.error({ err }, "listSavedMajors failed");
    res.status(500).json({ error: "Failed to load your saved majors" });
  }
});

router.put("/saved-majors", requireAuth, async (req, res) => {
  const parsed = UpsertSavedMajorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid saved major data" });
    return;
  }
  const userId = authUserId(req);
  const { majorName, description, career, colleges } = parsed.data;
  try {
    const [row] = await db
      .insert(savedMajorsTable)
      .values({
        userId,
        majorName,
        description,
        career: career ?? null,
        colleges: colleges as SavedCollegeSnapshot[],
      })
      .onConflictDoUpdate({
        target: [savedMajorsTable.userId, savedMajorsTable.majorName],
        // Never touch userId / majorName / savedAt: keep the original save time
        // so re-saving a major doesn't reshuffle the Saved view ordering.
        set: {
          description,
          career: career ?? null,
          colleges: colleges as SavedCollegeSnapshot[],
        },
      })
      .returning();
    res.json(toItem(row));
  } catch (err) {
    req.log.error({ err }, "upsertSavedMajor failed");
    res.status(500).json({ error: "Failed to save major" });
  }
});

router.post("/saved-majors/import", requireAuth, async (req, res) => {
  const parsed = ImportSavedMajorsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid import data" });
    return;
  }
  const userId = authUserId(req);
  const items = parsed.data.items;
  if (items.length === 0) {
    res.json({ imported: 0, skipped: 0 });
    return;
  }
  try {
    const inserted = await db
      .insert(savedMajorsTable)
      .values(
        items.map((item) => ({
          userId,
          majorName: item.majorName,
          description: item.description,
          career: item.career ?? null,
          colleges: item.colleges as SavedCollegeSnapshot[],
        })),
      )
      .onConflictDoNothing()
      .returning({ id: savedMajorsTable.id });
    res.json({ imported: inserted.length, skipped: items.length - inserted.length });
  } catch (err) {
    req.log.error({ err }, "importSavedMajors failed");
    res.status(500).json({ error: "Failed to import saved majors" });
  }
});

router.delete("/saved-majors/:id", requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const userId = authUserId(req);
  try {
    const deleted = await db
      .delete(savedMajorsTable)
      .where(and(eq(savedMajorsTable.id, id), eq(savedMajorsTable.userId, userId)))
      .returning({ id: savedMajorsTable.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "Saved major not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "deleteSavedMajor failed");
    res.status(500).json({ error: "Failed to remove saved major" });
  }
});

export default router;
