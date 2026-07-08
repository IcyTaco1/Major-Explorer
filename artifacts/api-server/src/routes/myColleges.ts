import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, myCollegesTable, type MyCollegeRow } from "@workspace/db";
import {
  CreateMyCollegeBody,
  UpdateMyCollegeBody,
  ImportMyCollegesBody,
} from "@workspace/api-zod";
import { requireAuth, authUserId } from "../middlewares/requireAuth";
import { touchProfile } from "../lib/userProfile";

const router: IRouter = Router();

interface CollegeSnapshot {
  rank: number;
  name: string;
  location: string;
  highlights: string;
  [key: string]: unknown;
}

function toItem(row: MyCollegeRow) {
  const fallback: CollegeSnapshot = {
    rank: 0,
    name: row.collegeName,
    location: "",
    highlights: "",
  };
  const college =
    row.collegeData && typeof row.collegeData === "object"
      ? (row.collegeData as CollegeSnapshot)
      : fallback;
  return {
    id: row.id,
    major: row.major,
    collegeName: row.collegeName,
    applicationStatus: row.applicationStatus,
    notes: row.notes,
    earlyDecisionDeadline: row.earlyDecisionDeadline,
    regularDecisionDeadline: row.regularDecisionDeadline,
    fafsaDeadline: row.fafsaDeadline,
    college,
    savedAt: row.savedAt.toISOString(),
  };
}

function parseId(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get("/my-colleges", requireAuth, async (req, res) => {
  const userId = authUserId(req);
  void touchProfile(userId);
  try {
    const rows = await db
      .select()
      .from(myCollegesTable)
      .where(eq(myCollegesTable.userId, userId))
      .orderBy(desc(myCollegesTable.savedAt));
    res.json(rows.map(toItem));
  } catch (err) {
    req.log.error({ err }, "listMyColleges failed");
    res.status(500).json({ error: "Failed to load your colleges" });
  }
});

router.post("/my-colleges", requireAuth, async (req, res) => {
  const parsed = CreateMyCollegeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid college data" });
    return;
  }
  const userId = authUserId(req);
  try {
    const [inserted] = await db
      .insert(myCollegesTable)
      .values({
        userId,
        major: parsed.data.major,
        collegeName: parsed.data.collegeName,
        collegeData: parsed.data.college,
      })
      .onConflictDoNothing()
      .returning();
    if (inserted) {
      res.status(201).json(toItem(inserted));
      return;
    }
    const [existing] = await db
      .select()
      .from(myCollegesTable)
      .where(
        and(
          eq(myCollegesTable.userId, userId),
          eq(myCollegesTable.major, parsed.data.major),
          eq(myCollegesTable.collegeName, parsed.data.collegeName),
        ),
      );
    if (!existing) {
      res.status(409).json({ error: "College could not be saved, please retry" });
      return;
    }
    res.status(201).json(toItem(existing));
  } catch (err) {
    req.log.error({ err }, "createMyCollege failed");
    res.status(500).json({ error: "Failed to save college" });
  }
});

router.post("/my-colleges/import", requireAuth, async (req, res) => {
  const parsed = ImportMyCollegesBody.safeParse(req.body);
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
      .insert(myCollegesTable)
      .values(
        items.map((item) => ({
          userId,
          major: item.major,
          collegeName: item.collegeName,
          collegeData: item.college,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: myCollegesTable.id });
    res.json({ imported: inserted.length, skipped: items.length - inserted.length });
  } catch (err) {
    req.log.error({ err }, "importMyColleges failed");
    res.status(500).json({ error: "Failed to import colleges" });
  }
});

router.patch("/my-colleges/:id", requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateMyCollegeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid update data" });
    return;
  }
  const userId = authUserId(req);
  const set: Partial<MyCollegeRow> = {};
  if (parsed.data.applicationStatus !== undefined) set.applicationStatus = parsed.data.applicationStatus;
  if (parsed.data.notes !== undefined) set.notes = parsed.data.notes;
  if (parsed.data.earlyDecisionDeadline !== undefined) set.earlyDecisionDeadline = parsed.data.earlyDecisionDeadline;
  if (parsed.data.regularDecisionDeadline !== undefined) set.regularDecisionDeadline = parsed.data.regularDecisionDeadline;
  if (parsed.data.fafsaDeadline !== undefined) set.fafsaDeadline = parsed.data.fafsaDeadline;

  try {
    const ownership = and(
      eq(myCollegesTable.id, id),
      eq(myCollegesTable.userId, userId),
    );
    if (Object.keys(set).length === 0) {
      const [row] = await db.select().from(myCollegesTable).where(ownership);
      if (!row) {
        res.status(404).json({ error: "College not found" });
        return;
      }
      res.json(toItem(row));
      return;
    }
    const [updated] = await db
      .update(myCollegesTable)
      .set(set)
      .where(ownership)
      .returning();
    if (!updated) {
      res.status(404).json({ error: "College not found" });
      return;
    }
    res.json(toItem(updated));
  } catch (err) {
    req.log.error({ err }, "updateMyCollege failed");
    res.status(500).json({ error: "Failed to update college" });
  }
});

router.delete("/my-colleges/:id", requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const userId = authUserId(req);
  try {
    const deleted = await db
      .delete(myCollegesTable)
      .where(
        and(eq(myCollegesTable.id, id), eq(myCollegesTable.userId, userId)),
      )
      .returning({ id: myCollegesTable.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "College not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "deleteMyCollege failed");
    res.status(500).json({ error: "Failed to remove college" });
  }
});

export default router;
