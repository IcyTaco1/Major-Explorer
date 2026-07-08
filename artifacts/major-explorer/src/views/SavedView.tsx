import { useState } from "react";
import TiltedCard from "@/components/TiltedCard";
import RevealBorderGlow from "@/components/RevealBorderGlow";
import { Bookmark, GraduationCap, ChevronUp, ChevronDown, Trash2, SortAsc, X } from "lucide-react";
import { CollegeFitBadge, type SortMode } from "@/lib/collegeFit";
import type { SavedCollege, SavedData } from "@/lib/storage";

export default function SavedView({ saved, onUnsaveMajor, onUnsaveCollege, userGpa }: {
  saved: SavedData;
  onUnsaveMajor: (majorName: string) => void;
  onUnsaveCollege: (majorName: string, collegeName: string) => void;
  userGpa: number | null;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sortMode, setSortMode] = useState<Record<string, SortMode>>({});

  const majors = Object.values(saved).sort((a, b) => b.savedAt - a.savedAt);

  const toggleExpand = (name: string) => setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  const getSortMode = (name: string): SortMode => sortMode[name] || "rank";
  const toggleSort = (name: string) => setSortMode(prev => ({ ...prev, [name]: prev[name] === "alpha" ? "rank" : "alpha" }));
  const sortedColleges = (colleges: SavedCollege[], mode: SortMode) =>
    mode === "alpha" ? [...colleges].sort((a, b) => a.name.localeCompare(b.name)) : [...colleges].sort((a, b) => a.rank - b.rank);

  if (majors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
          <Bookmark className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-serif text-foreground font-bold mb-2">No saved items yet</h3>
        <p className="text-muted-foreground max-w-sm">Search for a major and click "Save Major" to bookmark it here.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-foreground">Saved</h2>
        <p className="text-muted-foreground mt-1">{majors.length} saved {majors.length === 1 ? "major" : "majors"}</p>
      </div>
      <div className="space-y-4">
        {majors.map((item) => {
          const isOpen = expanded[item.majorName] !== false;
          const mode = getSortMode(item.majorName);
          const colleges = sortedColleges(item.colleges, mode);
          return (
            <TiltedCard key={item.majorName}>
              <RevealBorderGlow>
              <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 p-5 md:p-6">
                <button onClick={() => toggleExpand(item.majorName)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-bold text-foreground text-lg leading-tight">{item.majorName}</h3>
                    <p className="text-muted-foreground text-sm mt-0.5">{item.colleges.length} saved {item.colleges.length === 1 ? "college" : "colleges"}</p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </button>
                <button onClick={() => onUnsaveMajor(item.majorName)} className="w-9 h-9 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0" title="Remove major">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {isOpen && item.description && (
                <div className="px-5 md:px-6 pb-4 -mt-2">
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{item.description}</p>
                </div>
              )}
              {isOpen && (
                <div className="border-t border-border">
                  {item.colleges.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between px-5 md:px-6 py-3 bg-background">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saved Colleges</span>
                        <button onClick={() => toggleSort(item.majorName)} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                          <SortAsc className="w-3.5 h-3.5" />
                          {mode === "rank" ? "By Rank" : "A–Z"}
                        </button>
                      </div>
                      <ul className="divide-y divide-border">
                        {colleges.map((college) => (
                          <li key={college.name} className="flex items-center gap-3 px-5 md:px-6 py-3.5 hover:bg-muted transition-colors">
                            <span className="w-7 h-7 rounded-lg bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">#{college.rank}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground text-sm truncate">{college.name}</p>
                                <CollegeFitBadge userGpa={userGpa} admissionsProfile={college.admissionsProfile} className="flex-shrink-0" />
                              </div>
                              <p className="text-muted-foreground text-xs">{college.location}</p>
                            </div>
                            <button onClick={() => onUnsaveCollege(item.majorName, college.name)} className="w-7 h-7 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0" title="Remove">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="px-5 md:px-6 py-4 text-sm text-muted-foreground italic">No colleges saved for this major yet.</p>
                  )}
                </div>
              )}
              </div>
              </RevealBorderGlow>
            </TiltedCard>
          );
        })}
      </div>
    </div>
  );
}
