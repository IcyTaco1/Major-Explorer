import { BarChart3 } from "lucide-react";
import type { College } from "@workspace/api-client-react";
import type { UserProfile } from "@/lib/storage";

// ─── Admission comparison (your GPA/SAT/ACT vs typical admitted) ───────
type CompareRow = {
  key: "gpa" | "sat" | "act";
  label: string;
  user: number | null;
  low: number;
  high: number;
  min: number;
  max: number;
  format: (n: number) => string;
};

function buildCompareRows(profile: UserProfile, ap: College["admissionsProfile"]): CompareRow[] {
  if (!ap) return [];
  const rows: CompareRow[] = [];
  const gpaFmt = (n: number) => n.toFixed(2);
  const intFmt = (n: number) => String(Math.round(n));
  if (ap.gpaLow != null && ap.gpaHigh != null) {
    rows.push({ key: "gpa", label: "GPA", user: profile.gpa, low: ap.gpaLow, high: ap.gpaHigh, min: 0, max: 4, format: gpaFmt });
  }
  if (ap.satLow != null && ap.satHigh != null) {
    rows.push({ key: "sat", label: "SAT", user: profile.sat, low: ap.satLow, high: ap.satHigh, min: 400, max: 1600, format: intFmt });
  }
  if (ap.actLow != null && ap.actHigh != null) {
    rows.push({ key: "act", label: "ACT", user: profile.act, low: ap.actLow, high: ap.actHigh, min: 1, max: 36, format: intFmt });
  }
  return rows;
}

function standing(user: number, low: number, high: number): { label: string; chip: string; dot: string } {
  if (user > high) return { label: "Above typical", chip: "text-emerald-700 bg-emerald-100 ring-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/40 dark:ring-emerald-800", dot: "bg-emerald-500" };
  if (user < low) return { label: "Below typical", chip: "text-rose-700 bg-rose-100 ring-rose-200 dark:text-rose-300 dark:bg-rose-900/40 dark:ring-rose-800", dot: "bg-rose-500" };
  return { label: "In middle 50%", chip: "text-amber-700 bg-amber-100 ring-amber-200 dark:text-amber-300 dark:bg-amber-900/40 dark:ring-amber-800", dot: "bg-amber-500" };
}

export default function AdmissionComparison({ profile, admissionsProfile }: {
  profile: UserProfile;
  admissionsProfile: College["admissionsProfile"];
}) {
  const rows = buildCompareRows(profile, admissionsProfile);
  const hasAnyUserStat = profile.gpa != null || profile.sat != null || profile.act != null;

  return (
    <div className="rounded-2xl border border-border bg-background p-5" data-testid="admission-comparison">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">How you compare</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">The middle 50% of admitted students. Estimated figures — a rough guide, not a prediction.</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">We don't have admitted-student score ranges for this school yet.</p>
      ) : (
        <>
          {!hasAnyUserStat && (
            <p className="text-sm text-muted-foreground mb-4">Add your GPA and SAT/ACT in Settings to see how you stack up against these ranges.</p>
          )}
          <div className="space-y-4">
            {rows.map((r) => {
              const s = r.user != null ? standing(r.user, r.low, r.high) : null;
              const pos = (v: number) => Math.max(0, Math.min(100, ((v - r.min) / (r.max - r.min)) * 100));
              const bandLeft = pos(r.low);
              const bandWidth = Math.min(100 - bandLeft, Math.max(3, pos(r.high) - pos(r.low)));
              const marker = r.user != null ? pos(r.user) : null;
              return (
                <div key={r.key} data-testid={`compare-${r.key}`}>
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <div className="text-xs">
                      <span className="text-sm font-bold text-foreground mr-2">{r.label}</span>
                      <span className="text-muted-foreground">
                        {r.user != null && (<>You <span className="font-semibold text-foreground">{r.format(r.user)}</span> · </>)}
                        Typical {r.format(r.low)}–{r.format(r.high)}
                      </span>
                    </div>
                    {s && <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${s.chip}`}>{s.label}</span>}
                  </div>
                  <div className="relative h-2 rounded-full bg-muted">
                    <div className="absolute top-0 h-2 rounded-full bg-primary/25" style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }} />
                    {marker != null && s && <div className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full ring-2 ring-card ${s.dot}`} style={{ left: `${marker}%` }} />}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
