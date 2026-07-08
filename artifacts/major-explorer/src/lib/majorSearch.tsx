import type { ReactNode } from "react";
import { MAJOR_CATALOG } from "@/lib/quiz";

// Top 8 most-awarded U.S. bachelor's degree fields, in exact order of degrees
// conferred. Source: NCES Digest of Education Statistics 2023, Table 322.10
// (2021–22 — the most recent published data; the 2022–23 Digest is not yet out):
//   1. Business (375,418)            -> Business
//   2. Health Professions (263,765)  -> Nursing
//   3. Social Sciences & History (151,109) -> Political Science
//   4. Biological Sciences (131,462) -> Biology
//   5. Psychology (129,609)          -> Psychology
//   6. Engineering (123,017)         -> Mechanical Engineering
//   7. Computer & Info Sciences (108,503) -> Computer Science
//   8. Visual & Performing Arts (90,241)  -> Fine Arts
// Broad NCES fields are mapped to recognizable, searchable major names.
export const POPULAR_MAJORS = [
  "Business",
  "Nursing",
  "Political Science",
  "Biology",
  "Psychology",
  "Mechanical Engineering",
  "Computer Science",
  "Fine Arts",
];

// ─── Major search autocomplete ────────────────────────────────────────
// Deduped, sorted list of known majors used to power the search suggestions.
const ALL_MAJORS: string[] = Array.from(
  new Set([...POPULAR_MAJORS, ...MAJOR_CATALOG.map((m) => m.name)])
).sort((a, b) => a.localeCompare(b));

// Prefix matches rank above substring matches; the exact-typed name is dropped
// (no point suggesting what the user already typed in full).
export function matchMajors(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const name of ALL_MAJORS) {
    const l = name.toLowerCase();
    if (l === q) continue;
    if (l.startsWith(q)) starts.push(name);
    else if (l.includes(q)) contains.push(name);
  }
  return [...starts, ...contains].slice(0, 7);
}

// Renders a suggestion with the matched portion emphasized (Google-style).
export function renderMajorMatch(name: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return name;
  const idx = name.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return name;
  return (
    <>
      {name.slice(0, idx)}
      <span className="font-semibold text-foreground">{name.slice(idx, idx + q.length)}</span>
      {name.slice(idx + q.length)}
    </>
  );
}
