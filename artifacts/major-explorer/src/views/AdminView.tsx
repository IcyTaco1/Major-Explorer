import { useGetAdminStats, useListAdminUsers } from "@workspace/api-client-react";
import type { LabelCount } from "@workspace/api-client-react";
import TiltedCard from "@/components/TiltedCard";
import RevealBorderGlow from "@/components/RevealBorderGlow";
import { STATUS_META } from "@/views/MyCollegesView";
import type { ApplicationStatus } from "@workspace/api-client-react";
import {
  Users, Activity, Bookmark, AlertCircle, RotateCcw, ShieldCheck,
} from "lucide-react";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="glass-panel rounded-2xl border border-border p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <p className="text-3xl font-serif font-bold text-foreground" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
    </div>
  );
}

function BarList({ title, rows }: { title: string; rows: LabelCount[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="glass-panel rounded-2xl border border-border p-5">
      <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No data yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-foreground truncate">{row.label}</span>
                <span className="text-xs font-bold text-muted-foreground flex-shrink-0">{row.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(row.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminView() {
  const statsQuery = useGetAdminStats();
  const usersQuery = useListAdminUsers();

  if (statsQuery.isPending || usersQuery.isPending) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-10">
        <div className="h-8 bg-muted rounded w-48 mb-8 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl border border-border p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-3" />
              <div className="h-8 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (statsQuery.isError || usersQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-rose-500" />
        </div>
        <h3 className="text-lg font-serif font-bold text-foreground mb-1.5">Couldn't load admin data</h3>
        <p className="text-muted-foreground max-w-sm mb-5">You may not have admin access, or something went wrong.</p>
        <button
          onClick={() => { statsQuery.refetch(); usersQuery.refetch(); }}
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const stats = statsQuery.data;
  const users = usersQuery.data ?? [];

  const gradeRows: LabelCount[] = [...stats.gradeDistribution]
    .sort((a, b) => (a.gradeLevel ?? 99) - (b.gradeLevel ?? 99))
    .map((g) => ({ label: g.gradeLevel == null ? "Not set" : `${g.gradeLevel}th grade`, count: g.count }));

  const statusRows: LabelCount[] = stats.statusCounts.map((s) => ({
    label: STATUS_META[s.label as ApplicationStatus]?.label ?? s.label,
    count: s.count,
  }));

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-3xl font-serif font-bold text-foreground leading-tight">Admin Dashboard</h2>
          <p className="text-muted-foreground text-sm">User activity and saved-college statistics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Users} label="Total users" value={stats.totalUsers} />
        <StatCard icon={Activity} label="Active last 7 days" value={stats.activeLast7Days} />
        <StatCard icon={Bookmark} label="Saved colleges" value={stats.totalSavedColleges} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <BarList title="Grade distribution" rows={gradeRows} />
        <BarList title="Application statuses" rows={statusRows} />
        <BarList title="Top saved majors" rows={stats.topMajors} />
        <BarList title="Top saved colleges" rows={stats.topColleges} />
      </div>

      <TiltedCard>
        <RevealBorderGlow>
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="px-5 md:px-6 py-4 bg-background border-b border-border">
            <h3 className="font-serif font-bold text-foreground text-base">Users ({users.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border">
                  <th className="px-5 md:px-6 py-3">User</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Colleges</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.userId} className="hover:bg-muted transition-colors" data-testid={`row-user-${u.userId}`}>
                    <td className="px-5 md:px-6 py-3">
                      <p className="font-semibold text-foreground">{u.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.gradeLevel == null ? "—" : `${u.gradeLevel}th`}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.savedCollegeCount}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(u.lastSeenAt)}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground italic">No users yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </RevealBorderGlow>
      </TiltedCard>
    </div>
  );
}
