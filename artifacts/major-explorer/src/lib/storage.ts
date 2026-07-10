import type { College, CareerInfo } from "@workspace/api-client-react";

// ─── Types & Storage ─────────────────────────────────────────────────
export interface SavedCollege extends College { savedAt: number; }
export interface SavedMajor {
  majorName: string;
  description: string;
  savedAt: number;
  colleges: SavedCollege[];
  career?: CareerInfo | null;
}
export type SavedData = Record<string, SavedMajor>;

export interface MyCollege extends College {
  majorName: string;
  savedAt: number;
}

export const SAVED_KEY = "declare-saved-majors";
export const MY_COLLEGES_KEY = "next-steps-my-colleges";
export const QUIZ_DONE_KEY = "next-steps-quiz-done";
export const QUIZ_RESULTS_KEY = "next-steps-quiz-results";

export function loadSaved(): SavedData {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "{}") ?? {}; }
  catch { return {}; }
}
// Legacy local storage — read once to migrate previously saved colleges to the account.
export function loadMyColleges(): MyCollege[] {
  try { return JSON.parse(localStorage.getItem(MY_COLLEGES_KEY) ?? "[]") ?? []; }
  catch { return []; }
}

// User profile (GPA + test scores + goals). Cached in localStorage for fast
// startup; the account (server) copy is the source of truth once loaded.
export interface UserProfile {
  gpa: number | null;
  sat: number | null;
  act: number | null;
  goals: string;
}
export const PROFILE_KEY = "next-steps-profile";
export const EMPTY_PROFILE: UserProfile = { gpa: null, sat: null, act: null, goals: "" };
export function loadProfile(): UserProfile {
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return { ...EMPTY_PROFILE };
    const r = raw as Partial<UserProfile>;
    const inRange = (v: unknown, lo: number, hi: number): number | null =>
      typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : null;
    return {
      gpa: inRange(r.gpa, 0, 4),
      sat: inRange(r.sat, 400, 1600),
      act: inRange(r.act, 1, 36),
      goals: typeof r.goals === "string" ? r.goals : "",
    };
  } catch { return { ...EMPTY_PROFILE }; }
}
export function persistProfile(data: UserProfile) { localStorage.setItem(PROFILE_KEY, JSON.stringify(data)); }
