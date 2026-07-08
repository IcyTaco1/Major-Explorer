import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMyColleges,
  useUpdateMyCollege,
  useDeleteMyCollege,
  useGetCollegeDeadlines,
  getListMyCollegesQueryKey,
} from "@workspace/api-client-react";
import type { MyCollegeItem, ApplicationStatus, MyCollegeUpdate, CollegeDeadlines } from "@workspace/api-client-react";
import TiltedCard from "@/components/TiltedCard";
import RevealBorderGlow from "@/components/RevealBorderGlow";
import { CollegeFitBadge, type SortMode } from "@/lib/collegeFit";
import {
  GraduationCap, MapPin, SortAsc, Trash2, ChevronDown,
  CalendarDays, AlertCircle, RotateCcw, Check,
  Sparkles, Loader2, ExternalLink,
} from "lucide-react";

export const STATUS_META: Record<ApplicationStatus, { label: string; cls: string; dot: string }> = {
  not_applied: { label: "Not applied", cls: "bg-muted text-muted-foreground ring-border", dot: "bg-muted-foreground/60" },
  applied: { label: "Applied", cls: "bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:ring-sky-800", dot: "bg-sky-500" },
  interviewed: { label: "Interviewed", cls: "bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:ring-violet-800", dot: "bg-violet-500" },
  accepted: { label: "Accepted", cls: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", cls: "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:ring-rose-800", dot: "bg-rose-500" },
  waitlisted: { label: "Waitlisted", cls: "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-800", dot: "bg-amber-500" },
};

const STATUS_ORDER: ApplicationStatus[] = [
  "not_applied", "applied", "interviewed", "waitlisted", "accepted", "rejected",
];

function parseDeadline(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function formatDeadline(value: string): string {
  return parseDeadline(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(value: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseDeadline(value).getTime() - today.getTime()) / 86400000);
}

function nextDeadline(item: MyCollegeItem): { label: string; date: string } | null {
  const candidates: { label: string; date: string }[] = [];
  if (item.earlyDecisionDeadline) candidates.push({ label: "Early Decision", date: item.earlyDecisionDeadline });
  if (item.regularDecisionDeadline) candidates.push({ label: "Regular Decision", date: item.regularDecisionDeadline });
  if (item.fafsaDeadline) candidates.push({ label: "FAFSA", date: item.fafsaDeadline });
  const upcoming = candidates
    .filter((c) => daysUntil(c.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}

function DeadlineChip({ item }: { item: MyCollegeItem }) {
  const next = nextDeadline(item);
  if (!next) return null;
  const days = daysUntil(next.date);
  const urgent = days <= 14;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 ${urgent ? "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:ring-rose-800" : "bg-muted text-muted-foreground ring-border"}`}
      title={`${next.label} deadline: ${formatDeadline(next.date)}`}
      data-testid={`chip-deadline-${item.id}`}
    >
      <CalendarDays className="w-3 h-3" />
      {days === 0 ? "Due today" : `${days}d`}
    </span>
  );
}

const OFFICIAL_FIELDS: { key: keyof Pick<CollegeDeadlines, "earlyDecision" | "regularDecision" | "fafsa">; patchKey: "earlyDecisionDeadline" | "regularDecisionDeadline" | "fafsaDeadline"; label: string }[] = [
  { key: "earlyDecision", patchKey: "earlyDecisionDeadline", label: "Early Decision" },
  { key: "regularDecision", patchKey: "regularDecisionDeadline", label: "Regular Decision" },
  { key: "fafsa", patchKey: "fafsaDeadline", label: "FAFSA" },
];

function OfficialDeadlines({ item, official, fetching, error, onFetch, onPatch, saving }: {
  item: MyCollegeItem;
  official: CollegeDeadlines | undefined;
  fetching: boolean;
  error: boolean;
  onFetch: () => void;
  onPatch: (data: MyCollegeUpdate) => void;
  saving: boolean;
}) {
  if (!official) {
    return (
      <div className="mt-2.5">
        <button
          disabled={fetching}
          onClick={onFetch}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ring-1 ring-border bg-background text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
          data-testid={`button-fetch-deadlines-${item.id}`}
        >
          {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {fetching ? "Checking official sources…" : "Find official dates"}
        </button>
        {error && (
          <p className="text-xs text-rose-500 mt-1.5" data-testid={`text-deadlines-error-${item.id}`}>
            Couldn't look up deadlines right now. Please try again.
          </p>
        )}
      </div>
    );
  }

  const found = OFFICIAL_FIELDS.filter(({ key }) => official[key]);
  const applicable = found.filter(({ key, patchKey }) => official[key] !== item[patchKey]);

  return (
    <div className="mt-3 rounded-xl border border-border bg-background/70 px-3.5 py-3" data-testid={`panel-official-deadlines-${item.id}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <p className="text-xs font-bold text-foreground">
          Official dates{official.cycle ? ` · ${official.cycle}` : ""}
        </p>
      </div>
      {found.length > 0 ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1.5">
          {found.map(({ key, label }) => (
            <span key={key} className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{label}:</span> {formatDeadline(official[key] as string)}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mb-1.5">No published dates found for this college.</p>
      )}
      {official.notes && <p className="text-xs text-muted-foreground italic mb-1.5">{official.notes}</p>}
      {official.sources.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1.5">
          {official.sources.slice(0, 3).map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline max-w-[16rem] truncate"
              title={s.title}
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{s.title}</span>
            </a>
          ))}
        </div>
      )}
      {applicable.length > 0 && (
        <button
          disabled={saving}
          onClick={() => {
            const patch: MyCollegeUpdate = {};
            for (const { key, patchKey } of applicable) {
              (patch as Record<string, string>)[patchKey] = official[key] as string;
            }
            onPatch(patch);
          }}
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3.5 py-1.5 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
          data-testid={`button-apply-deadlines-${item.id}`}
        >
          <Check className="w-3.5 h-3.5" />
          Use these dates
        </button>
      )}
      {found.length > 0 && applicable.length === 0 && (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <Check className="w-3.5 h-3.5" /> Dates applied
        </span>
      )}
    </div>
  );
}

function CollegeDetail({ item, onPatch, saving, official, fetching, fetchError, onFetchOfficial }: {
  item: MyCollegeItem;
  onPatch: (data: MyCollegeUpdate) => void;
  saving: boolean;
  official: CollegeDeadlines | undefined;
  fetching: boolean;
  fetchError: boolean;
  onFetchOfficial: () => void;
}) {
  const [notes, setNotes] = useState(item.notes);
  const [justSaved, setJustSaved] = useState(false);
  const notesDirty = notes !== item.notes;

  const deadlineFields: { key: "earlyDecisionDeadline" | "regularDecisionDeadline" | "fafsaDeadline"; label: string }[] = [
    { key: "earlyDecisionDeadline", label: "Early Decision" },
    { key: "regularDecisionDeadline", label: "Regular Decision" },
    { key: "fafsaDeadline", label: "FAFSA" },
  ];

  return (
    <div className="px-5 md:px-6 py-4 bg-muted/40 border-t border-border space-y-4" data-testid={`detail-college-${item.id}`}>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Application status</p>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_ORDER.map((s) => {
            const meta = STATUS_META[s];
            const active = item.applicationStatus === s;
            return (
              <button
                key={s}
                disabled={saving}
                onClick={() => { if (!active) onPatch({ applicationStatus: s }); }}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ring-1 transition-colors disabled:opacity-60 ${active ? meta.cls : "bg-background text-muted-foreground ring-border hover:text-foreground"}`}
                data-testid={`button-status-${s}-${item.id}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${active ? meta.dot : "bg-border"}`} />
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Deadlines</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {deadlineFields.map(({ key, label }) => (
            <label key={key} className="block">
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
              <input
                type="date"
                defaultValue={item[key] ?? ""}
                onChange={(e) => onPatch({ [key]: e.target.value === "" ? null : e.target.value } as MyCollegeUpdate)}
                className="mt-1 w-full rounded-lg border border-border bg-background text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid={`input-${key}-${item.id}`}
              />
            </label>
          ))}
        </div>
        <OfficialDeadlines
          item={item}
          official={official}
          fetching={fetching}
          error={fetchError}
          onFetch={onFetchOfficial}
          onPatch={onPatch}
          saving={saving}
        />
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Notes</p>
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setJustSaved(false); }}
          rows={3}
          maxLength={5000}
          placeholder="Essay topics, campus visit impressions, financial aid details…"
          className="w-full rounded-lg border border-border bg-background text-foreground text-sm px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          data-testid={`input-notes-${item.id}`}
        />
        <div className="flex items-center gap-3 mt-1.5">
          <button
            disabled={!notesDirty || saving}
            onClick={() => { onPatch({ notes }); setJustSaved(true); }}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
            data-testid={`button-save-notes-${item.id}`}
          >
            Save notes
          </button>
          {justSaved && !notesDirty && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyCollegesView({ userGpa }: { userGpa: number | null }) {
  const [sortMode, setSortMode] = useState<Record<string, SortMode>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // Fetched official deadlines, kept in the parent so the info panel survives
  // CollegeDetail remounts (its key changes whenever a deadline is applied).
  const [official, setOfficial] = useState<Record<number, CollegeDeadlines>>({});
  const [fetchingDeadlinesId, setFetchingDeadlinesId] = useState<number | null>(null);
  const [deadlinesErrorId, setDeadlinesErrorId] = useState<number | null>(null);
  const qc = useQueryClient();
  const listQuery = useListMyColleges();
  const updateMut = useUpdateMyCollege();
  const deleteMut = useDeleteMyCollege();
  const deadlinesMut = useGetCollegeDeadlines();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListMyCollegesQueryKey() });

  const patchItem = (id: number, data: MyCollegeUpdate) =>
    updateMut.mutate({ id, data }, { onSuccess: invalidate });

  const removeItem = (id: number) =>
    deleteMut.mutate({ id }, { onSuccess: invalidate });

  const fetchOfficialDeadlines = (item: MyCollegeItem) => {
    if (fetchingDeadlinesId !== null) return;
    setFetchingDeadlinesId(item.id);
    setDeadlinesErrorId(null);
    deadlinesMut.mutate(
      { data: { collegeName: item.collegeName } },
      {
        onSuccess: (data) => setOfficial((prev) => ({ ...prev, [item.id]: data })),
        onError: () => setDeadlinesErrorId(item.id),
        onSettled: () => setFetchingDeadlinesId(null),
      },
    );
  };

  if (listQuery.isPending) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-10">
        <div className="h-8 bg-muted rounded w-48 mb-2 animate-pulse" />
        <div className="h-4 bg-muted rounded w-32 mb-8 animate-pulse" />
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl border border-border p-6 animate-pulse">
              <div className="h-5 bg-muted rounded w-1/3 mb-4" />
              <div className="h-4 bg-muted rounded w-full mb-2" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-rose-500" />
        </div>
        <h3 className="text-lg font-serif font-bold text-foreground mb-1.5">Couldn't load your colleges</h3>
        <p className="text-muted-foreground max-w-sm mb-5">Something went wrong. Please try again.</p>
        <button onClick={() => listQuery.refetch()} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors">
          <RotateCcw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const myColleges = listQuery.data ?? [];
  const totalColleges = myColleges.length;

  if (totalColleges === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
          <GraduationCap className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-serif text-foreground font-bold mb-2">No colleges saved yet</h3>
        <p className="text-muted-foreground max-w-sm">Browse majors and bookmark colleges to "My Colleges" using the save button on each college card.</p>
      </div>
    );
  }

  const grouped = myColleges.reduce<Record<string, MyCollegeItem[]>>((acc, c) => {
    (acc[c.major] ??= []).push(c);
    return acc;
  }, {});
  const groups = Object.entries(grouped).sort(([, a], [, b]) => b[0].savedAt.localeCompare(a[0].savedAt));

  const statusSummary = STATUS_ORDER
    .map((s) => ({ status: s, count: myColleges.filter((c) => c.applicationStatus === s).length }))
    .filter((s) => s.count > 0 && s.status !== "not_applied");

  const getSortMode = (name: string): SortMode => sortMode[name] || "rank";
  const toggleSort = (name: string) => setSortMode((prev) => ({ ...prev, [name]: prev[name] === "alpha" ? "rank" : "alpha" }));
  const saving = updateMut.isPending || deleteMut.isPending;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-foreground">My Colleges</h2>
        <p className="text-muted-foreground mt-1">{totalColleges} saved {totalColleges === 1 ? "college" : "colleges"}</p>
        {statusSummary.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {statusSummary.map(({ status, count }) => {
              const meta = STATUS_META[status];
              return (
                <span key={status} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${meta.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  {count} {meta.label.toLowerCase()}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <div className="space-y-6">
        {groups.map(([majorName, colleges]) => {
          const mode = getSortMode(majorName);
          const sorted = mode === "alpha"
            ? [...colleges].sort((a, b) => a.collegeName.localeCompare(b.collegeName))
            : [...colleges].sort((a, b) => a.college.rank - b.college.rank);
          return (
            <TiltedCard key={majorName}>
              <RevealBorderGlow>
              <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 md:px-6 py-4 bg-background border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-foreground text-base leading-tight">{majorName}</h3>
                    <p className="text-muted-foreground text-xs">{colleges.length} {colleges.length === 1 ? "college" : "colleges"}</p>
                  </div>
                </div>
                <button onClick={() => toggleSort(majorName)} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <SortAsc className="w-3.5 h-3.5" />
                  {mode === "rank" ? "By Rank" : "A–Z"}
                </button>
              </div>
              <ul className="divide-y divide-border">
                {sorted.map((item) => {
                  const expanded = expandedId === item.id;
                  const statusMeta = STATUS_META[item.applicationStatus];
                  return (
                    <li key={item.id}>
                      <div
                        className="group flex items-center gap-3 px-5 md:px-6 py-3.5 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => setExpandedId(expanded ? null : item.id)}
                        data-testid={`row-college-${item.id}`}
                      >
                        <span className="w-7 h-7 rounded-lg bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">#{item.college.rank}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground text-sm truncate">{item.collegeName}</p>
                            <CollegeFitBadge userGpa={userGpa} admissionsProfile={item.college.admissionsProfile} className="flex-shrink-0" />
                            {item.applicationStatus !== "not_applied" && (
                              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 flex-shrink-0 ${statusMeta.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                                {statusMeta.label}
                              </span>
                            )}
                            <DeadlineChip item={item} />
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <p className="text-muted-foreground text-xs">{item.college.location}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                          className="w-8 h-8 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0"
                          title="Remove"
                          data-testid={`button-remove-${item.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
                      </div>
                      {expanded && (
                        <CollegeDetail
                          key={`detail-${item.id}-${item.applicationStatus}-${item.earlyDecisionDeadline}-${item.regularDecisionDeadline}-${item.fafsaDeadline}`}
                          item={item}
                          onPatch={(data) => patchItem(item.id, data)}
                          saving={saving}
                          official={official[item.id]}
                          fetching={fetchingDeadlinesId === item.id}
                          fetchError={deadlinesErrorId === item.id}
                          onFetchOfficial={() => fetchOfficialDeadlines(item)}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
              </div>
              </RevealBorderGlow>
            </TiltedCard>
          );
        })}
      </div>
    </div>
  );
}
