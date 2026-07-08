import type { College } from "@workspace/api-client-react";

export type FitTier = "safety" | "match" | "reach";
export type SortMode = "rank" | "alpha";

// Fallback GPA bands by selectivity tier, used only when a college has no
// explicit admitted-GPA range. Unweighted 4.0 scale.
const TIER_GPA_BANDS: Record<string, { low: number; high: number }> = {
  most_selective: { low: 3.9, high: 4.0 },
  highly_selective: { low: 3.7, high: 3.95 },
  selective: { low: 3.3, high: 3.8 },
  accessible: { low: 2.5, high: 3.3 },
};

export function computeFit(userGpa: number | null, ap: College["admissionsProfile"]): FitTier | null {
  if (userGpa == null || !ap) return null;
  const band = TIER_GPA_BANDS[ap.selectivityTier];
  const low = ap.gpaLow ?? band?.low;
  const high = ap.gpaHigh ?? band?.high;
  if (low == null || high == null) return null;
  if (userGpa >= high) return "safety";
  if (userGpa >= low) return "match";
  return "reach";
}

const FIT_BADGE: Record<FitTier, { label: string; cls: string }> = {
  safety: { label: "Safety", cls: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800" },
  match: { label: "Match", cls: "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-800" },
  reach: { label: "Reach", cls: "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:ring-rose-800" },
};

export function CollegeFitBadge({ userGpa, admissionsProfile, className = "" }: {
  userGpa: number | null;
  admissionsProfile: College["admissionsProfile"];
  className?: string;
}) {
  const fit = computeFit(userGpa, admissionsProfile);
  if (!fit) return null;
  const { label, cls } = FIT_BADGE[fit];
  return (
    <span
      title="Estimated fit based on your GPA vs the college's typical admitted GPA range. A rough guide, not a prediction."
      className={`inline-flex items-center text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${cls} ${className}`}
      data-testid={`badge-fit-${fit}`}
    >
      {label}
    </span>
  );
}
