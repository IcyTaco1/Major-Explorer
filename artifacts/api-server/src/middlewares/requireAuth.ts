import { getAuth } from "@clerk/express";
import type { Request, RequestHandler } from "express";

export const requireAuth: RequestHandler = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  next();
};

export function authUserId(req: Request): string {
  const { userId } = getAuth(req);
  if (!userId) {
    throw new Error("authUserId called on an unauthenticated request");
  }
  return userId;
}
