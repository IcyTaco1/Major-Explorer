// Raw curated record as stored in the dataset.
export interface CareerRecord {
  socCode: string;
  occupation: string;
  annualMedianWage: number;
  annualEntryWage: number;
  annualExperiencedWage: number;
  projectedGrowthPct: number;
  typicalEducation: string;
  keywords: string[];
}

// Public shape returned to API consumers — a record plus source attribution.
export interface CareerInfo {
  occupation: string;
  socCode: string;
  annualMedianWage: number;
  annualEntryWage: number;
  annualExperiencedWage: number;
  projectedGrowthPct: number;
  typicalEducation: string;
  sourceName: string;
  sourceUrl: string;
  wageDataYear: string;
  growthDataPeriod: string;
}

// BLS "typical entry-level education" categories, ordered from least to most.
export type EducationLevel =
  | "No formal educational credential"
  | "High school diploma or equivalent"
  | "Some college, no degree"
  | "Postsecondary nondegree award"
  | "Associate's degree"
  | "Bachelor's degree"
  | "Master's degree"
  | "Doctoral or professional degree";
