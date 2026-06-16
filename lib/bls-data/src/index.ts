import { CAREER_RECORDS } from "./dataset.js";
import type { CareerInfo, CareerRecord } from "./types.js";

export type { CareerInfo, CareerRecord, EducationLevel } from "./types.js";

// ─── Source attribution (applied to every returned CareerInfo) ───────────
export const BLS_SOURCE_NAME = "U.S. Bureau of Labor Statistics";
export const BLS_SOURCE_URL = "https://www.bls.gov/ooh/";
export const BLS_WAGE_DATA_YEAR = "May 2023 (OEWS)";
export const BLS_GROWTH_DATA_PERIOD = "2023–2033 (Employment Projections)";

function toCareerInfo(record: CareerRecord): CareerInfo {
  return {
    occupation: record.occupation,
    socCode: record.socCode,
    annualMedianWage: record.annualMedianWage,
    annualEntryWage: record.annualEntryWage,
    annualExperiencedWage: record.annualExperiencedWage,
    projectedGrowthPct: record.projectedGrowthPct,
    typicalEducation: record.typicalEducation,
    sourceName: BLS_SOURCE_NAME,
    sourceUrl: BLS_SOURCE_URL,
    wageDataYear: BLS_WAGE_DATA_YEAR,
    growthDataPeriod: BLS_GROWTH_DATA_PERIOD,
  };
}

/** Every occupation in the dataset, with source attribution attached. */
export function getAllCareers(): CareerInfo[] {
  return CAREER_RECORDS.map(toCareerInfo);
}

/** The list of valid SOC codes — used to validate an AI classification. */
export function getValidSocCodes(): string[] {
  return CAREER_RECORDS.map((r) => r.socCode);
}

/** A compact whitelist (SOC + title) to give an AI classifier. */
export function getOccupationWhitelist(): { socCode: string; occupation: string }[] {
  return CAREER_RECORDS.map((r) => ({ socCode: r.socCode, occupation: r.occupation }));
}

/** Look up a single occupation by its exact SOC code. */
export function findCareerBySoc(socCode: string): CareerInfo | null {
  const match = CAREER_RECORDS.find((r) => r.socCode === socCode.trim());
  return match ? toCareerInfo(match) : null;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Deterministically map an open-ended major/search string to its closest
 * standard occupation using keyword and title matching. Returns null when no
 * confident match is found (caller may then fall back to AI classification).
 */
export function findCareerByMajor(major: string): CareerInfo | null {
  const query = normalize(major);
  if (!query) return null;

  let best: { record: CareerRecord; score: number } | null = null;

  for (const record of CAREER_RECORDS) {
    let score = 0;

    for (const keyword of record.keywords) {
      const kw = normalize(keyword);
      if (!kw) continue;
      if (query === kw) {
        // Exact whole-string keyword match — strongest signal.
        score = Math.max(score, 1000 + kw.length);
      } else if (query.includes(kw)) {
        // Query contains the keyword phrase (e.g. "b.s. in nursing").
        score = Math.max(score, 100 + kw.length);
      } else if (kw.includes(query) && query.length >= 4) {
        // Keyword contains the query (e.g. query "psych").
        score = Math.max(score, 50 + query.length);
      }
    }

    // Fall back to matching against words in the occupation title.
    const title = normalize(record.occupation);
    if (query.length >= 4 && (title.includes(query) || query.includes(title))) {
      score = Math.max(score, 40 + query.length);
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { record, score };
    }
  }

  return best ? toCareerInfo(best.record) : null;
}
