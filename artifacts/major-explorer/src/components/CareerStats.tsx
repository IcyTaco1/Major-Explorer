import { Briefcase, TrendingUp, Award, ExternalLink } from "lucide-react";
import type { CareerInfo } from "@workspace/api-client-react";
import { formatUSD } from "@/lib/format";

// ─── Career stats (real BLS data) ─────────────────────────────────────
export default function CareerStats({ career }: { career: CareerInfo | null }) {
  if (!career) {
    return (
      <div className="relative z-10 border-t border-border pt-6">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Career Outlook</span>
        </div>
        <p className="text-sm text-muted-foreground" data-testid="text-career-unavailable">
          We don't have official labor-statistics data matched to this major yet. Try a closely related field to see salary and job-growth figures.
        </p>
      </div>
    );
  }

  const growthPositive = career.projectedGrowthPct >= 0;

  return (
    <div className="relative z-10 border-t border-border pt-6" data-testid="section-career-stats">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Career Outlook</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground">Typical career: {career.occupation}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-background rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1 font-medium">Entry (10th pct)</p>
          <p className="text-lg font-bold text-foreground" data-testid="text-wage-entry">{formatUSD(career.annualEntryWage)}</p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-950/40 rounded-xl p-4 text-center ring-1 ring-indigo-100 dark:ring-indigo-900/50">
          <p className="text-xs text-indigo-400 dark:text-indigo-300 mb-1 font-medium">Median</p>
          <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300" data-testid="text-wage-median">{formatUSD(career.annualMedianWage)}</p>
        </div>
        <div className="bg-background rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1 font-medium">Experienced (90th pct)</p>
          <p className="text-lg font-bold text-foreground" data-testid="text-wage-experienced">{formatUSD(career.annualExperiencedWage)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-3 bg-background rounded-xl p-4">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${growthPositive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"}`}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Projected job growth</p>
            <p className="text-base font-bold text-foreground" data-testid="text-growth">
              {growthPositive ? "+" : ""}{career.projectedGrowthPct}%{" "}
              <span className="text-xs font-normal text-muted-foreground">· {career.growthDataPeriod}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-background rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-border text-foreground flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Typical entry-level education</p>
            <p className="text-base font-bold text-foreground" data-testid="text-education">{career.typicalEducation}</p>
          </div>
        </div>
      </div>

      <a
        href={career.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-muted-foreground transition-colors"
      >
        <ExternalLink className="w-3 h-3" />
        Source: {career.sourceName} · Wages {career.wageDataYear}
      </a>
    </div>
  );
}
