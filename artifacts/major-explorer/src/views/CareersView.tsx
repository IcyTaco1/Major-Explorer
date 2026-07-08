import { useState, useEffect, useMemo } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGetCareers } from "@workspace/api-client-react";
import type { CareerInfo } from "@workspace/api-client-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import TiltedCard from "@/components/TiltedCard";
import { formatUSD } from "@/lib/format";
import {
  Search, AlertCircle, RotateCcw, TrendingUp, Award, Briefcase, SlidersHorizontal,
} from "lucide-react";

const DEGREE_ORDER = [
  "No formal educational credential",
  "High school diploma or equivalent",
  "Postsecondary nondegree award",
  "Some college, no degree",
  "Associate's degree",
  "Bachelor's degree",
  "Master's degree",
  "Doctoral or professional degree",
];
const WAGE_OPTIONS = [
  { label: "Any salary", value: 0 },
  { label: "$40k+", value: 40000 },
  { label: "$60k+", value: 60000 },
  { label: "$80k+", value: 80000 },
  { label: "$100k+", value: 100000 },
  { label: "$120k+", value: 120000 },
];
const GROWTH_OPTIONS = [
  { label: "Any growth", value: -100 },
  { label: "0%+ (stable)", value: 0 },
  { label: "5%+", value: 5 },
  { label: "10%+ (fast)", value: 10 },
  { label: "20%+ (much faster)", value: 20 },
];

function CareerCard({ c }: { c: CareerInfo }) {
  const revealRef = useScrollReveal<HTMLDivElement>();
  const up = c.projectedGrowthPct >= 0;
  return (
    <TiltedCard>
    <div
      ref={revealRef}
      className="relative glass-panel rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
      data-testid={`card-career-${c.socCode}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-serif font-bold text-foreground text-base leading-tight">{c.occupation}</h3>
        <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0 mt-1">{c.socCode}</span>
      </div>
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-2xl font-bold text-foreground">{formatUSD(c.annualMedianWage)}</span>
        <span className="text-xs text-muted-foreground">median / yr</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${up ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"}`}>
          <TrendingUp className="w-3 h-3" />{up ? "+" : ""}{c.projectedGrowthPct}%
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg bg-muted text-muted-foreground">
          <Award className="w-3 h-3" />{c.typicalEducation}
        </span>
      </div>
      <div className="text-xs text-muted-foreground mt-auto pt-1">
        Entry {formatUSD(c.annualEntryWage)} · Experienced {formatUSD(c.annualExperiencedWage)}
      </div>
    </div>
    </TiltedCard>
  );
}

export default function CareersView() {
  const { data: careers, isLoading, isError, refetch, isFetching } = useGetCareers();
  const [search, setSearch] = useState("");
  const [minWage, setMinWage] = useState(0);
  const [minGrowth, setMinGrowth] = useState(-100);
  const [degree, setDegree] = useState("any");

  const degreeOptions = useMemo(() => {
    const present = new Set((careers ?? []).map((c) => c.typicalEducation));
    return DEGREE_ORDER.filter((d) => present.has(d));
  }, [careers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (careers ?? [])
      .filter((c) => (q ? c.occupation.toLowerCase().includes(q) : true))
      .filter((c) => (minWage > 0 ? c.annualMedianWage >= minWage : true))
      .filter((c) => (minGrowth > -100 ? c.projectedGrowthPct >= minGrowth : true))
      .filter((c) => (degree !== "any" ? c.typicalEducation === degree : true))
      .sort((a, b) => b.annualMedianWage - a.annualMedianWage);
  }, [careers, search, minWage, minGrowth, degree]);

  const filtersActive = search.trim() !== "" || minWage > 0 || minGrowth > -100 || degree !== "any";
  const resetFilters = () => { setSearch(""); setMinWage(0); setMinGrowth(-100); setDegree("any"); };

  // Reveal triggers cache their start positions; recompute them whenever the
  // filtered list changes so persisting cards that shift into view aren't left
  // stuck hidden (opacity 0).
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [filtered]);

  const selectCls = "px-3 py-2 rounded-xl border border-border glass-panel text-sm font-medium text-foreground outline-none focus:border-primary transition-colors cursor-pointer";

  return (
    <main className="w-full max-w-5xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h2 className="text-3xl font-serif font-bold text-foreground">Browse Careers</h2>
        <p className="text-muted-foreground mt-1">Explore occupations with real salary and job-growth data from the U.S. Bureau of Labor Statistics.</p>
      </div>

      <div className="glass-panel rounded-2xl border border-border shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search occupations…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border text-sm outline-none focus:border-primary transition-colors"
              data-testid="input-career-search"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <select value={minWage} onChange={(e) => setMinWage(Number(e.target.value))} className={selectCls} data-testid="select-wage">
              {WAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={minGrowth} onChange={(e) => setMinGrowth(Number(e.target.value))} className={selectCls} data-testid="select-growth">
              {GROWTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={degree} onChange={(e) => setDegree(e.target.value)} className={selectCls} data-testid="select-degree">
              <option value="any">Any education</option>
              {degreeOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {filtersActive && (
              <button onClick={resetFilters} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground px-2 py-2 transition-colors" data-testid="button-reset-filters">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl border border-border p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-3" />
              <div className="h-7 bg-muted rounded w-1/2 mb-3" />
              <div className="h-5 bg-muted rounded w-full mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-rose-500" />
          </div>
          <h3 className="text-lg font-serif font-bold text-foreground mb-1.5">Couldn't load careers</h3>
          <p className="text-muted-foreground max-w-sm mb-5">Something went wrong fetching the career data. Please try again.</p>
          <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors">
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Briefcase className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-serif font-bold text-foreground mb-1.5">No careers match your filters</h3>
          <p className="text-muted-foreground max-w-sm mb-5">Try widening your salary, growth, or education filters.</p>
          {filtersActive && (
            <button onClick={resetFilters} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors">
              <RotateCcw className="w-4 h-4" /> Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">{filtered.length} {filtered.length === 1 ? "occupation" : "occupations"}{isFetching ? " · refreshing…" : ""}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <CareerCard key={c.socCode} c={c} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Source: U.S. Bureau of Labor Statistics — OEWS wages &amp; Employment Projections. Figures are national medians.
          </p>
        </>
      )}
    </main>
  );
}
