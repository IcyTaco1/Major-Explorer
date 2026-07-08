import { useState } from "react";
import type { College } from "@workspace/api-client-react";
import TiltedCard from "@/components/TiltedCard";
import RevealBorderGlow from "@/components/RevealBorderGlow";
import { CollegeFitBadge } from "@/lib/collegeFit";
import { Scale, GraduationCap, MapPin, ArrowLeftRight } from "lucide-react";

export interface CompareMajorData {
  majorName: string;
  description: string;
  colleges: College[];
}

const TIER_LABELS: Record<string, string> = {
  most_selective: "Most selective",
  highly_selective: "Highly selective",
  selective: "Selective",
  accessible: "Accessible",
};

function selectivityMix(colleges: College[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of colleges) {
    const tier = c.admissionsProfile?.selectivityTier;
    if (!tier) continue;
    counts.set(tier, (counts.get(tier) ?? 0) + 1);
  }
  return Object.keys(TIER_LABELS)
    .filter((t) => counts.has(t))
    .map((t) => ({ label: TIER_LABELS[t], count: counts.get(t)! }));
}

function MajorPanel({ data, userGpa, otherCollegeNames }: {
  data: CompareMajorData;
  userGpa: number | null;
  otherCollegeNames: Set<string>;
}) {
  const mix = selectivityMix(data.colleges);
  const sorted = [...data.colleges].sort((a, b) => a.rank - b.rank);
  return (
    <TiltedCard>
      <RevealBorderGlow>
      <div className="glass-panel rounded-2xl overflow-hidden h-full">
        <div className="flex items-center gap-3 px-5 md:px-6 py-4 bg-background border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-primary-foreground" />
          </div>
          <h3 className="font-serif font-bold text-foreground text-base leading-tight">{data.majorName}</h3>
        </div>
        <div className="px-5 md:px-6 py-4 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{data.description || "No description saved for this major."}</p>
          {mix.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Selectivity mix</p>
              <div className="flex flex-wrap gap-1.5">
                {mix.map((m) => (
                  <span key={m.label} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 bg-muted text-muted-foreground ring-border">
                    {m.label} · {m.count}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
              Saved colleges ({sorted.length})
            </p>
            {sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No colleges saved for this major yet.</p>
            ) : (
              <ul className="space-y-2">
                {sorted.map((c) => (
                  <li key={c.name} className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-muted text-muted-foreground text-[11px] font-bold flex items-center justify-center flex-shrink-0">#{c.rank}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-foreground truncate">{c.name}</span>
                        <CollegeFitBadge userGpa={userGpa} admissionsProfile={c.admissionsProfile} className="flex-shrink-0" />
                        {otherCollegeNames.has(c.name) && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ring-1 bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:ring-sky-800 flex-shrink-0" title="Also strong for the other major">
                            <ArrowLeftRight className="w-2.5 h-2.5" /> Both
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {c.location}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      </RevealBorderGlow>
    </TiltedCard>
  );
}

export default function CompareView({ majors, userGpa }: {
  majors: CompareMajorData[];
  userGpa: number | null;
}) {
  const [aName, setAName] = useState(majors[0]?.majorName ?? "");
  const [bName, setBName] = useState(majors[1]?.majorName ?? "");

  if (majors.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
          <Scale className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-serif text-foreground font-bold mb-2">Save at least two majors to compare</h3>
        <p className="text-muted-foreground max-w-sm">Look up majors in the Explore tab and save the ones you're considering — then come back here to see them side by side.</p>
      </div>
    );
  }

  const a = majors.find((m) => m.majorName === aName) ?? majors[0];
  const b = majors.find((m) => m.majorName === bName) ?? majors[1];
  const aCollegeNames = new Set(a.colleges.map((c) => c.name));
  const bCollegeNames = new Set(b.colleges.map((c) => c.name));

  const selectCls = "w-full rounded-lg border border-border bg-background text-foreground text-sm font-medium px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-foreground">Compare Majors</h2>
        <p className="text-muted-foreground mt-1">See two of your saved majors side by side.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <select value={a.majorName} onChange={(e) => setAName(e.target.value)} className={selectCls} data-testid="select-major-a">
          {majors.map((m) => (
            <option key={m.majorName} value={m.majorName}>{m.majorName}</option>
          ))}
        </select>
        <select value={b.majorName} onChange={(e) => setBName(e.target.value)} className={selectCls} data-testid="select-major-b">
          {majors.map((m) => (
            <option key={m.majorName} value={m.majorName}>{m.majorName}</option>
          ))}
        </select>
      </div>

      {a.majorName === b.majorName ? (
        <p className="text-sm text-muted-foreground italic text-center py-10">Pick two different majors to compare.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          <MajorPanel data={a} userGpa={userGpa} otherCollegeNames={bCollegeNames} />
          <MajorPanel data={b} userGpa={userGpa} otherCollegeNames={aCollegeNames} />
        </div>
      )}
    </div>
  );
}
