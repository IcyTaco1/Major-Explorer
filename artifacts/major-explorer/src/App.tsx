import { useState, useEffect, useCallback } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLookupMajor, useGetMajorCurriculum } from "@workspace/api-client-react";
import type { College, CurriculumResponse } from "@workspace/api-client-react";
import {
  Search, GraduationCap, MapPin, BookMarked, AlertCircle, X,
  ChevronRight, Bookmark, BookmarkCheck, Trash2, ArrowUpDown,
  ChevronDown, ChevronUp, SortAsc
} from "lucide-react";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// ─── Saved Data Types ────────────────────────────────────────────────
interface SavedCollege extends College {
  savedAt: number;
}

interface SavedMajor {
  majorName: string;
  description: string;
  savedAt: number;
  colleges: SavedCollege[];
}

type SavedData = Record<string, SavedMajor>;

const STORAGE_KEY = "declare-saved-majors";

function loadSaved(): SavedData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistSaved(data: SavedData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Curriculum Modal ────────────────────────────────────────────────
function CurriculumModal({ college, major, onClose }: { college: College; major: string; onClose: () => void }) {
  const getCurriculum = useGetMajorCurriculum();

  useEffect(() => {
    getCurriculum.mutate({ data: { major, college: college.name } });
  }, []);

  const curriculum = getCurriculum.data as CurriculumResponse | undefined;
  const isLoading = getCurriculum.isPending;
  const isError = getCurriculum.isError;

  const yearColors = [
    { bg: "bg-blue-50", border: "border-blue-100", badge: "bg-blue-100 text-blue-800", dot: "bg-blue-400" },
    { bg: "bg-indigo-50", border: "border-indigo-100", badge: "bg-indigo-100 text-indigo-800", dot: "bg-indigo-400" },
    { bg: "bg-violet-50", border: "border-violet-100", badge: "bg-violet-100 text-violet-800", dot: "bg-violet-400" },
    { bg: "bg-slate-50", border: "border-slate-200", badge: "bg-slate-900 text-white", dot: "bg-slate-600" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full md:max-w-2xl max-h-[90vh] bg-white md:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-400"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 md:p-8 border-b border-slate-100 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{major}</span>
            <h2 className="text-xl md:text-2xl font-serif font-bold text-slate-900 leading-tight mt-1">{college.name}</h2>
            <div className="flex items-center text-slate-500 mt-1 text-sm">
              <MapPin className="w-3.5 h-3.5 mr-1" />{college.location}
            </div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors" aria-label="Close">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 md:p-8">
          {isLoading && (
            <div className="space-y-6 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-100 p-5 space-y-3">
                  <div className="h-5 bg-slate-100 rounded w-32" />
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  {[1, 2, 3].map((j) => <div key={j} className="h-4 bg-slate-100 rounded w-full" />)}
                </div>
              ))}
            </div>
          )}
          {isError && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
              <p className="text-slate-700 font-medium">Could not load the curriculum.</p>
            </div>
          )}
          {!isLoading && !isError && curriculum && (
            <div className="space-y-5 animate-in fade-in duration-500">
              <p className="text-sm text-slate-500 font-medium">4-Year Course Plan</p>
              {curriculum.years.map((year, idx) => {
                const colors = yearColors[idx] || yearColors[0];
                return (
                  <div key={year.year} className={`rounded-2xl border ${colors.border} ${colors.bg} p-5`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${colors.badge}`}>{year.label}</span>
                    </div>
                    <p className="text-slate-600 text-sm mb-4 leading-relaxed">{year.focus}</p>
                    <ul className="space-y-3">
                      {year.courses.map((course, cIdx) => (
                        <li key={cIdx} className="flex gap-3">
                          <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                          <div>
                            <span className="font-semibold text-slate-900 text-sm">{course.name}</span>
                            <span className="text-slate-500 text-sm"> — {course.description}</span>
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

// ─── Saved View ──────────────────────────────────────────────────────
type SortMode = "rank" | "alpha";

function SavedView({ saved, onUnsaveMajor, onUnsaveCollege }: {
  saved: SavedData;
  onUnsaveMajor: (majorName: string) => void;
  onUnsaveCollege: (majorName: string, collegeName: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sortMode, setSortMode] = useState<Record<string, SortMode>>({});

  const majors = Object.values(saved).sort((a, b) => b.savedAt - a.savedAt);

  const toggleExpand = (name: string) => setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  const getSortMode = (name: string): SortMode => sortMode[name] || "rank";
  const toggleSort = (name: string) => setSortMode(prev => ({
    ...prev, [name]: prev[name] === "alpha" ? "rank" : "alpha"
  }));

  const sortedColleges = (colleges: SavedCollege[], mode: SortMode) => {
    if (mode === "alpha") return [...colleges].sort((a, b) => a.name.localeCompare(b.name));
    return [...colleges].sort((a, b) => a.rank - b.rank);
  };

  if (majors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
          <Bookmark className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-serif text-slate-800 font-bold mb-2">No saved items yet</h3>
        <p className="text-slate-500 max-w-sm">Search for a major and click the bookmark icon to save it here. You can also save individual colleges under each major.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-slate-900">Saved List</h2>
        <p className="text-slate-500 mt-1">{majors.length} saved {majors.length === 1 ? "major" : "majors"}</p>
      </div>
      <div className="space-y-4">
        {majors.map((saved) => {
          const isOpen = expanded[saved.majorName] !== false; // default open
          const mode = getSortMode(saved.majorName);
          const colleges = sortedColleges(saved.colleges, mode);

          return (
            <div key={saved.majorName} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {/* Major Header */}
              <div className="flex items-center gap-3 p-5 md:p-6">
                <button
                  onClick={() => toggleExpand(saved.majorName)}
                  className="flex-1 flex items-center gap-3 text-left min-w-0"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-bold text-slate-900 text-lg leading-tight">{saved.majorName}</h3>
                    <p className="text-slate-500 text-sm mt-0.5">
                      {saved.colleges.length} saved {saved.colleges.length === 1 ? "college" : "colleges"}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>
                <button
                  onClick={() => onUnsaveMajor(saved.majorName)}
                  className="w-9 h-9 rounded-full hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                  title="Remove major"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Description snippet */}
              {isOpen && saved.description && (
                <div className="px-5 md:px-6 pb-4 -mt-2">
                  <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{saved.description}</p>
                </div>
              )}

              {/* Colleges */}
              {isOpen && (
                <div className="border-t border-slate-100">
                  {saved.colleges.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between px-5 md:px-6 py-3 bg-slate-50">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saved Colleges</span>
                        <button
                          onClick={() => toggleSort(saved.majorName)}
                          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          <SortAsc className="w-3.5 h-3.5" />
                          {mode === "rank" ? "By Rank" : "A–Z"}
                        </button>
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {colleges.map((college) => (
                          <li key={college.name} className="flex items-center gap-3 px-5 md:px-6 py-3.5 hover:bg-slate-50 transition-colors">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                              #{college.rank}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate">{college.name}</p>
                              <p className="text-slate-500 text-xs">{college.location}</p>
                            </div>
                            <button
                              onClick={() => onUnsaveCollege(saved.majorName, college.name)}
                              className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                              title="Remove college"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="px-5 md:px-6 py-4 text-sm text-slate-400 italic">No colleges saved for this major yet.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Explore View (Home) ─────────────────────────────────────────────
function ExploreView({ saved, setSaved }: { saved: SavedData; setSaved: (d: SavedData) => void }) {
  const [inputValue, setInputValue] = useState("");
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [currentMajor, setCurrentMajor] = useState("");
  const lookupMajor = useLookupMajor();

  const handleSearch = () => {
    if (!inputValue.trim()) return;
    setSelectedCollege(null);
    lookupMajor.mutate({ data: { major: inputValue } });
    setCurrentMajor(inputValue.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const setSuggestedMajor = (major: string) => {
    setInputValue(major);
    setSelectedCollege(null);
    lookupMajor.mutate({ data: { major } });
    setCurrentMajor(major);
  };

  const isMajorSaved = (majorName: string) => !!saved[majorName];
  const isCollegeSaved = (majorName: string, collegeName: string) =>
    !!saved[majorName]?.colleges.find((c) => c.name === collegeName);

  const saveMajor = useCallback(() => {
    if (!lookupMajor.data) return;
    const { major, description } = lookupMajor.data;
    const updated = { ...saved };
    if (!updated[major]) {
      updated[major] = { majorName: major, description, savedAt: Date.now(), colleges: [] };
    } else {
      updated[major].description = description;
    }
    setSaved(updated);
    persistSaved(updated);
  }, [saved, lookupMajor.data, setSaved]);

  const unsaveMajor = useCallback(() => {
    if (!lookupMajor.data) return;
    const updated = { ...saved };
    delete updated[lookupMajor.data.major];
    setSaved(updated);
    persistSaved(updated);
  }, [saved, lookupMajor.data, setSaved]);

  const saveCollege = useCallback((college: College) => {
    if (!lookupMajor.data) return;
    const { major, description } = lookupMajor.data;
    const updated = { ...saved };
    if (!updated[major]) {
      updated[major] = { majorName: major, description, savedAt: Date.now(), colleges: [] };
    }
    if (!updated[major].colleges.find((c) => c.name === college.name)) {
      updated[major].colleges = [...updated[major].colleges, { ...college, savedAt: Date.now() }];
    }
    setSaved(updated);
    persistSaved(updated);
  }, [saved, lookupMajor.data, setSaved]);

  const unsaveCollege = useCallback((college: College) => {
    if (!lookupMajor.data) return;
    const { major } = lookupMajor.data;
    const updated = { ...saved };
    if (updated[major]) {
      updated[major].colleges = updated[major].colleges.filter((c) => c.name !== college.name);
    }
    setSaved(updated);
    persistSaved(updated);
  }, [saved, lookupMajor.data, setSaved]);

  const isIdle = lookupMajor.isIdle && !lookupMajor.data;
  const isLoading = lookupMajor.isPending;
  const isError = lookupMajor.isError;
  const result = lookupMajor.data;

  return (
    <main className="flex-1 flex flex-col items-center pt-14 md:pt-20 px-4 pb-24">
      {/* Search Header */}
      <div className="w-full max-w-3xl flex flex-col items-center text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-slate-900 font-bold mb-5 leading-tight">
          Discover your academic path.
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mb-8">
          Explore college majors, understand their focus, and discover the top universities renowned for these programs.
        </p>
        <div className="w-full max-w-2xl relative flex items-center group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-32 py-4 md:py-5 border border-slate-200 rounded-full text-lg shadow-sm focus:ring-2 focus:ring-slate-800 focus:border-slate-800 transition-all bg-white text-slate-900 placeholder-slate-400"
            placeholder="e.g. Finance, Computer Science, Nursing..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            data-testid="input-major"
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-full font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              data-testid="button-search"
            >
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Explore"}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl">
        {/* Welcome */}
        {isIdle && (
          <div className="flex flex-col items-center justify-center animate-in fade-in duration-500 delay-300 fill-mode-both">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Suggested Majors</p>
            <div className="flex flex-wrap justify-center gap-3">
              {["Finance", "Computer Science", "Nursing", "Psychology", "Mechanical Engineering"].map((major) => (
                <button key={major} onClick={() => setSuggestedMajor(major)} className="px-5 py-2.5 bg-white border border-slate-200 rounded-full text-slate-700 hover:border-slate-400 hover:shadow-sm transition-all">
                  {major}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="w-full animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12 mb-8 animate-pulse">
              <div className="h-10 bg-slate-100 rounded w-1/3 mb-6" />
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-slate-100 rounded" style={{ width: `${85 + (i * 3)}%` }} />)}
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-8 bg-slate-100 rounded w-48 mb-2 animate-pulse" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex gap-6 animate-pulse">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-slate-100 rounded w-1/3" />
                    <div className="h-4 bg-slate-100 rounded w-1/4" />
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="w-full bg-red-50 border border-red-100 rounded-2xl p-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
            <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
            <h3 className="text-xl font-serif text-red-900 mb-2">Could not load results</h3>
            <p className="text-red-700 max-w-md">We had trouble looking that up. Please check the spelling and try again.</p>
          </div>
        )}

        {/* Results */}
        {!isLoading && !isError && result && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Major Description Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12 mb-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none" />
              <div className="flex items-start justify-between gap-4 mb-5 relative z-10">
                <h2 className="text-3xl md:text-4xl font-serif text-slate-900 font-bold leading-tight">
                  {result.major}
                </h2>
                <button
                  onClick={isMajorSaved(result.major) ? unsaveMajor : saveMajor}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                    isMajorSaved(result.major)
                      ? "bg-slate-900 border-slate-900 text-white hover:bg-slate-700"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900"
                  }`}
                  data-testid="button-save-major"
                >
                  {isMajorSaved(result.major)
                    ? <><BookmarkCheck className="w-4 h-4" /> Saved</>
                    : <><Bookmark className="w-4 h-4" /> Save Major</>
                  }
                </button>
              </div>
              <p className="text-lg leading-relaxed text-slate-700 relative z-10" data-testid="text-major-description">
                {result.description}
              </p>
            </div>

            {/* Colleges */}
            <div className="mb-4 flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-slate-800" />
              <h3 className="text-2xl font-serif text-slate-900 font-bold">Top Colleges</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">Click a college to see its 4-year course plan. Save any college to your list.</p>

            <div className="space-y-4" data-testid="list-top-colleges">
              {result.topColleges.map((college, index) => {
                const saved_college = isCollegeSaved(result.major, college.name);
                return (
                  <div
                    key={college.rank}
                    className={`bg-white rounded-2xl border border-slate-200 transition-all duration-200 hover:shadow-md hover:border-slate-300 group animate-in fade-in slide-in-from-bottom-4 stagger-${index + 1} fill-mode-both`}
                    data-testid={`item-college-${college.rank}`}
                  >
                    <div className="flex gap-4 md:gap-6 p-5 md:p-6">
                      {/* Rank Badge */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-slate-50 text-slate-800 font-serif font-bold text-xl md:text-2xl flex items-center justify-center border border-slate-100 shadow-sm">
                          #{college.rank}
                        </div>
                      </div>

                      {/* Content — clicking this opens curriculum */}
                      <button
                        className="flex-1 min-w-0 text-left"
                        onClick={() => setSelectedCollege(college)}
                      >
                        <h4 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-slate-700 transition-colors">
                          {college.name}
                        </h4>
                        <div className="flex items-center text-slate-500 mb-3 text-sm font-medium">
                          <MapPin className="w-4 h-4 mr-1.5 opacity-70" />{college.location}
                        </div>
                        <p className="text-slate-600 leading-relaxed text-sm md:text-base">{college.highlights}</p>
                      </button>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex flex-col items-center gap-2 pl-2 md:pl-4 md:border-l md:border-slate-100">
                        <button
                          onClick={() => saved_college ? unsaveCollege(college) : saveCollege(college)}
                          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                            saved_college
                              ? "bg-slate-900 border-slate-900 text-white"
                              : "bg-white border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-700"
                          }`}
                          title={saved_college ? "Remove from saved" : "Save college"}
                          data-testid={`button-save-college-${college.rank}`}
                        >
                          {saved_college ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Curriculum Modal */}
      {selectedCollege && (
        <CurriculumModal college={selectedCollege} major={currentMajor} onClose={() => setSelectedCollege(null)} />
      )}
    </main>
  );
}

// ─── App Shell ───────────────────────────────────────────────────────
type AppView = "explore" | "saved";

function AppShell() {
  const [view, setView] = useState<AppView>("explore");
  const [saved, setSaved] = useState<SavedData>(loadSaved);

  const savedCount = Object.keys(saved).length;

  const unsaveMajor = (majorName: string) => {
    const updated = { ...saved };
    delete updated[majorName];
    setSaved(updated);
    persistSaved(updated);
  };

  const unsaveCollege = (majorName: string, collegeName: string) => {
    const updated = { ...saved };
    if (updated[majorName]) {
      updated[majorName].colleges = updated[majorName].colleges.filter((c) => c.name !== collegeName);
    }
    setSaved(updated);
    persistSaved(updated);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-6 lg:px-12 flex items-center justify-between border-b border-slate-200 bg-white shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-2 text-slate-900">
          <BookMarked className="w-5 h-5 text-slate-700" />
          <span className="font-serif font-semibold text-lg tracking-tight">Declare</span>
        </div>
        <nav className="flex items-center gap-1">
          <button
            onClick={() => setView("explore")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              view === "explore" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Explore
          </button>
          <button
            onClick={() => setView("saved")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              view === "saved" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Saved
            {savedCount > 0 && (
              <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                view === "saved" ? "bg-white text-slate-900" : "bg-slate-900 text-white"
              }`}>
                {savedCount}
              </span>
            )}
          </button>
        </nav>
      </header>

      {view === "explore" && <ExploreView saved={saved} setSaved={setSaved} />}
      {view === "saved" && (
        <SavedView saved={saved} onUnsaveMajor={unsaveMajor} onUnsaveCollege={unsaveCollege} />
      )}
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AppShell} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
