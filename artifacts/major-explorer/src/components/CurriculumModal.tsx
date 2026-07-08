import { useEffect } from "react";
import { MapPin, X, AlertCircle } from "lucide-react";
import { useGetMajorCurriculum } from "@workspace/api-client-react";
import type { College, CurriculumResponse } from "@workspace/api-client-react";
import AdmissionComparison from "@/components/AdmissionComparison";
import type { UserProfile } from "@/lib/storage";

export default function CurriculumModal({ college, major, profile, onClose }: { college: College; major: string; profile: UserProfile; onClose: () => void }) {
  const getCurriculum = useGetMajorCurriculum();
  useEffect(() => { getCurriculum.mutate({ data: { major, college: college.name } }); }, []);

  const curriculum = getCurriculum.data as CurriculumResponse | undefined;
  const yearColors = [
    { bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-100 dark:border-blue-900/50", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200", dot: "bg-blue-400 dark:bg-blue-500" },
    { bg: "bg-indigo-50 dark:bg-indigo-950/40", border: "border-indigo-100 dark:border-indigo-900/50", badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200", dot: "bg-indigo-400 dark:bg-indigo-500" },
    { bg: "bg-violet-50 dark:bg-violet-950/40", border: "border-violet-100 dark:border-violet-900/50", badge: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200", dot: "bg-violet-400 dark:bg-violet-500" },
    { bg: "bg-background", border: "border-border", badge: "bg-primary text-primary-foreground", dot: "bg-muted-foreground" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full md:max-w-2xl max-h-[90vh] glass-popover md:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-400" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6 md:p-8 border-b border-border flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{major}</span>
            <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground leading-tight mt-1">{college.name}</h2>
            <div className="flex items-center text-muted-foreground mt-1 text-sm"><MapPin className="w-3.5 h-3.5 mr-1" />{college.location}</div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 w-9 h-9 rounded-full bg-muted hover:bg-muted flex items-center justify-center transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 md:p-8">
          <div className="mb-6">
            <AdmissionComparison profile={profile} admissionsProfile={college.admissionsProfile} />
          </div>
          {getCurriculum.isPending && (
            <div className="space-y-6 animate-pulse">
              {[1,2,3,4].map((i) => (
                <div key={i} className="rounded-2xl border border-border p-5 space-y-3">
                  <div className="h-5 bg-muted rounded w-32" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  {[1,2,3].map((j) => <div key={j} className="h-4 bg-muted rounded w-full" />)}
                </div>
              ))}
            </div>
          )}
          {getCurriculum.isError && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
              <p className="text-foreground font-medium">Could not load the curriculum.</p>
            </div>
          )}
          {!getCurriculum.isPending && !getCurriculum.isError && curriculum && (
            <div className="space-y-5 animate-in fade-in duration-500">
              <p className="text-sm text-muted-foreground font-medium">4-Year Course Plan</p>
              {curriculum.years.map((year, idx) => {
                const c = yearColors[idx] || yearColors[0];
                return (
                  <div key={year.year} className={`rounded-2xl border ${c.border} ${c.bg} p-5`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${c.badge}`}>{year.label}</span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{year.focus}</p>
                    <ul className="space-y-3">
                      {year.courses.map((course, cIdx) => (
                        <li key={cIdx} className="flex gap-3">
                          <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                          <div>
                            <span className="font-semibold text-foreground text-sm">{course.name}</span>
                            <span className="text-muted-foreground text-sm"> — {course.description}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
