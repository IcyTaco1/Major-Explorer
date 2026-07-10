import { useState, useEffect, useCallback, useRef, type KeyboardEvent } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLookupMajor } from "@workspace/api-client-react";
import type { College, MyCollegeItem, CareerInfo } from "@workspace/api-client-react";
import { computeFit, CollegeFitBadge, type FitTier } from "@/lib/collegeFit";
import { type SavedData, type UserProfile } from "@/lib/storage";
import { POPULAR_MAJORS, matchMajors, renderMajorMatch } from "@/lib/majorSearch";
import TiltedCard from "@/components/TiltedCard";
import RevealBorderGlow from "@/components/RevealBorderGlow";
import ScrollReveal from "@/components/ScrollReveal";
import CurriculumModal from "@/components/CurriculumModal";
import CareerStats from "@/components/CareerStats";
import FilterChips from "@/components/FilterChips";
import {
  Search, AlertCircle, GraduationCap, MapPin, Bookmark, BookmarkCheck,
  Check, ChevronRight, ChevronLeft,
} from "lucide-react";

export default function ExploreView({ saved, onSaveMajor, onUnsaveMajor, onToggleSavedCollege, myColleges, onToggleMyCollege, initialMajor, userGpa, profile }: {
  saved: SavedData;
  onSaveMajor: (majorName: string, description: string, career?: CareerInfo | null) => void;
  onUnsaveMajor: (majorName: string) => void;
  onToggleSavedCollege: (college: College, majorName: string, description: string, career?: CareerInfo | null) => void;
  myColleges: MyCollegeItem[];
  onToggleMyCollege: (college: College, majorName: string) => void;
  initialMajor?: string;
  userGpa: number | null;
  profile: UserProfile;
}) {
  const [inputValue, setInputValue] = useState(initialMajor || "");
  const [currentMajor, setCurrentMajor] = useState(initialMajor || "");
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [fitFilter, setFitFilter] = useState<FitTier | "all">("all");
  const [selFilter, setSelFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const lookupMajor = useLookupMajor();

  useEffect(() => {
    if (initialMajor) {
      lookupMajor.mutate({ data: { major: initialMajor } });
      setCurrentMajor(initialMajor);
    }
  }, [initialMajor]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const resetFilters = () => { setFitFilter("all"); setSelFilter("all"); setPage(0); };

  const handleSearch = () => {
    if (!inputValue.trim()) return;
    setSelectedCollege(null);
    setOpenDropdown(null);
    setShowSuggestions(false);
    setActiveIdx(-1);
    resetFilters();
    lookupMajor.mutate({ data: { major: inputValue } });
    setCurrentMajor(inputValue.trim());
  };

  const setSuggestedMajor = (major: string) => {
    setInputValue(major);
    setSelectedCollege(null);
    setOpenDropdown(null);
    setShowSuggestions(false);
    setActiveIdx(-1);
    resetFilters();
    lookupMajor.mutate({ data: { major } });
    setCurrentMajor(major);
  };

  const suggestions = showSuggestions ? matchMajors(inputValue) : [];

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setShowSuggestions(true);
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (showSuggestions && activeIdx >= 0 && suggestions[activeIdx]) {
        setSuggestedMajor(suggestions[activeIdx]);
      } else {
        handleSearch();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIdx(-1);
    }
  };

  const isMajorSaved = (majorName: string) => !!saved[majorName];

  const saveMajor = useCallback(() => {
    if (!lookupMajor.data) return;
    const { major, description, career } = lookupMajor.data;
    onSaveMajor(major, description, career);
  }, [lookupMajor.data, onSaveMajor]);

  const unsaveMajor = useCallback(() => {
    if (!lookupMajor.data) return;
    onUnsaveMajor(lookupMajor.data.major);
  }, [lookupMajor.data, onUnsaveMajor]);

  const isInSaved = (majorName: string, collegeName: string) =>
    !!saved[majorName]?.colleges.find((c) => c.name === collegeName);
  const isInMyColleges = (collegeName: string, majorName: string) =>
    myColleges.some((c) => c.collegeName === collegeName && c.major === majorName);
  const isAnywhereSaved = (majorName: string, collegeName: string) =>
    isInSaved(majorName, collegeName) || isInMyColleges(collegeName, majorName);

  const toggleSavedCollege = useCallback((college: College, majorName: string, description: string) => {
    const career = lookupMajor.data?.major === majorName ? lookupMajor.data.career : undefined;
    onToggleSavedCollege(college, majorName, description, career);
  }, [lookupMajor.data, onToggleSavedCollege]);


  const isIdle = lookupMajor.isIdle && !lookupMajor.data;
  const isLoading = lookupMajor.isPending;
  const isError = lookupMajor.isError;
  const result = lookupMajor.data;

  const totalColleges = result?.topColleges.length ?? 0;
  const filteredColleges = (result?.topColleges ?? []).filter((c) => {
    if (userGpa != null && fitFilter !== "all" && computeFit(userGpa, c.admissionsProfile) !== fitFilter) return false;
    if (selFilter !== "all" && c.admissionsProfile?.selectivityTier !== selFilter) return false;
    return true;
  });

  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(filteredColleges.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pagedColleges = filteredColleges.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  const rangeStart = filteredColleges.length === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const rangeEnd = currentPage * PAGE_SIZE + pagedColleges.length;
  const goToPage = (p: number) => {
    setPage(Math.min(pageCount - 1, Math.max(0, p)));
    dropdownRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Recompute reveal trigger positions when the college list changes (filters,
  // pagination, or a new major lookup) so shifted cards still reveal correctly.
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [filteredColleges.length, currentPage, result?.major]);

  return (
    <main className="flex-1 flex flex-col items-center pt-14 md:pt-20 px-4 pb-24">
      <div className="w-full max-w-3xl flex flex-col items-center text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground font-bold mb-5 leading-tight">Discover your academic path.</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mb-8">Explore college majors, understand their focus, and discover the top universities renowned for these programs.</p>
        <div ref={searchBoxRef} className="w-full max-w-2xl relative flex items-center group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-muted-foreground transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-32 py-4 md:py-5 border border-border rounded-full text-lg shadow-sm focus:ring-2 focus:ring-ring focus:border-ring transition-all glass-panel text-foreground placeholder:text-muted-foreground"
            placeholder="e.g. Finance, Computer Science, Nursing..."
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); setActiveIdx(-1); }}
            onFocus={() => { if (inputValue.trim()) setShowSuggestions(true); }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-autocomplete="list"
            aria-controls="major-suggestions-list"
            aria-activedescendant={activeIdx >= 0 ? `major-suggestion-${activeIdx}` : undefined}
            data-testid="input-major"
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <button onClick={handleSearch} disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-full font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2" data-testid="button-search">
              {isLoading ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-white rounded-full animate-spin" /> : "Explore"}
            </button>
          </div>
          {suggestions.length > 0 && (
            <div id="major-suggestions-list" role="listbox" className="absolute z-40 top-full left-0 right-0 mt-2 glass-popover border border-border rounded-2xl shadow-xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-1 duration-150" data-testid="major-suggestions">
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  id={`major-suggestion-${i}`}
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseDown={(e) => { e.preventDefault(); setSuggestedMajor(s); }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${i === activeIdx ? "bg-muted" : "hover:bg-muted"}`}
                  data-testid={`suggestion-${i}`}
                >
                  <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground text-base">{renderMajorMatch(s, inputValue)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-4xl">
        {isIdle && (
          <div className="flex flex-col items-center justify-center animate-in fade-in duration-500 delay-300 fill-mode-both">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Popular Majors</p>
            <p className="text-xs text-muted-foreground mb-4">Top fields by U.S. bachelor's degrees awarded · NCES 2021–22</p>
            <div className="flex flex-wrap justify-center gap-3">
              {POPULAR_MAJORS.map((major) => (
                <button key={major} onClick={() => setSuggestedMajor(major)} className="px-5 py-2.5 glass-panel border border-border rounded-full text-foreground hover:border-muted-foreground hover:shadow-sm transition-all">{major}</button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="w-full animate-in fade-in duration-300">
            <div className="flex items-center justify-center gap-2 mb-6 text-sm text-muted-foreground" data-testid="text-loading-hint">
              <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              Researching the top 50 colleges — this can take a minute or two. Hang tight.
            </div>
            <div className="glass-panel rounded-2xl shadow-sm border border-border p-8 md:p-12 mb-8 animate-pulse">
              <div className="h-10 bg-muted rounded w-1/3 mb-6" />
              <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-muted rounded" style={{ width: `${85+(i*3)}%` }} />)}</div>
            </div>
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-48 mb-2 animate-pulse" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="glass-panel rounded-xl shadow-sm border border-border p-6 flex gap-6 animate-pulse">
                  <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-muted rounded w-1/3" />
                    <div className="h-4 bg-muted rounded w-1/4" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isError && (
          <div className="w-full bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-2xl p-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
            <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
            <h3 className="text-xl font-serif text-red-900 dark:text-red-200 mb-2">Could not load results</h3>
            <p className="text-red-700 dark:text-red-300 max-w-md">We had trouble looking that up. Please check the spelling and try again.</p>
          </div>
        )}

        {!isLoading && !isError && result && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="glass-panel rounded-3xl shadow-sm border border-border p-8 md:p-12 mb-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-background rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none" />
              <div className="flex items-start justify-between gap-4 mb-5 relative z-10">
                <h2 className="text-3xl md:text-4xl font-serif text-foreground font-bold leading-tight">{result.major}</h2>
                <button
                  onClick={isMajorSaved(result.major) ? unsaveMajor : saveMajor}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${isMajorSaved(result.major) ? "bg-primary border-primary text-primary-foreground hover:bg-primary/90" : "glass-panel border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"}`}
                  data-testid="button-save-major"
                >
                  {isMajorSaved(result.major) ? <><BookmarkCheck className="w-4 h-4" /> Saved</> : <><Bookmark className="w-4 h-4" /> Save Major</>}
                </button>
              </div>
              <ScrollReveal
                key={result.major}
                containerClassName="relative z-10 mb-8"
                textClassName="text-lg leading-relaxed text-foreground"
                baseRotation={2}
                data-testid="text-major-description"
              >
                {result.description}
              </ScrollReveal>
              <CareerStats career={result.career} />
            </div>

            <div className="mb-4 flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-foreground" />
              <h3 className="text-2xl font-serif text-foreground font-bold">Top Colleges</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Click a college to see its 4-year course plan. Use the bookmark to save it to a list.</p>

            <div className="mb-5 glass-panel border border-border rounded-2xl p-4 space-y-3">
              {userGpa != null ? (
                <FilterChips
                  label="Fit"
                  value={fitFilter}
                  options={[
                    { value: "all", label: "All" },
                    { value: "reach", label: "Reach" },
                    { value: "match", label: "Match" },
                    { value: "safety", label: "Safety" },
                  ]}
                  onChange={(v) => { setFitFilter(v as FitTier | "all"); setPage(0); }}
                />
              ) : (
                <p className="text-xs text-muted-foreground">Add your GPA in Settings to filter by Reach / Match / Safety.</p>
              )}
              <FilterChips
                label="Selectivity"
                value={selFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "most_selective", label: "Most selective" },
                  { value: "highly_selective", label: "Highly selective" },
                  { value: "selective", label: "Selective" },
                  { value: "accessible", label: "Accessible" },
                ]}
                onChange={(v) => { setSelFilter(v); setPage(0); }}
              />
            </div>
            <p className="text-xs text-muted-foreground mb-4" data-testid="text-filter-count">Showing {rangeStart}–{rangeEnd} of {filteredColleges.length}{filteredColleges.length !== totalColleges ? ` (filtered from ${totalColleges})` : ""} colleges</p>

            <div ref={dropdownRef} className="space-y-4" data-testid="list-top-colleges">
              {filteredColleges.length === 0 && (
                <div className="glass-panel border border-border rounded-2xl p-8 text-center" data-testid="empty-filtered">
                  <p className="text-muted-foreground mb-3">No colleges match these filters.</p>
                  <button onClick={resetFilters} className="text-primary font-medium hover:underline" data-testid="button-clear-filters">Clear filters</button>
                </div>
              )}
              {pagedColleges.map((college, index) => {
                const anySaved = isAnywhereSaved(result.major, college.name);
                const inSaved = isInSaved(result.major, college.name);
                const inMyColleges = isInMyColleges(college.name, result.major);
                const dropKey = `${result.major}::${college.name}`;
                const isOpen = openDropdown === dropKey;

                return (
                  <TiltedCard
                    key={college.rank}
                    data-testid={`item-college-${college.rank}`}
                    containerClassName={isOpen ? "relative z-20" : ""}
                    disabled={isOpen}
                  >
                    <RevealBorderGlow className="group">
                    <div className="flex gap-4 md:gap-6 p-5 md:p-6">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-background text-foreground font-serif font-bold text-xl md:text-2xl flex items-center justify-center border border-border shadow-sm">
                          #{college.rank}
                        </div>
                      </div>
                      <button className="flex-1 min-w-0 text-left" onClick={() => { setOpenDropdown(null); setSelectedCollege(college); }}>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="text-xl font-bold text-foreground group-hover:text-foreground transition-colors">{college.name}</h4>
                          <CollegeFitBadge userGpa={userGpa} admissionsProfile={college.admissionsProfile} />
                        </div>
                        <div className="flex items-center text-muted-foreground mb-3 text-sm font-medium">
                          <MapPin className="w-4 h-4 mr-1.5 opacity-70" />{college.location}
                        </div>
                        <p className="text-muted-foreground leading-relaxed text-sm md:text-base">{college.highlights}</p>
                      </button>
                      <div className="flex-shrink-0 flex flex-col items-center gap-2 pl-2 md:pl-4 md:border-l md:border-border relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenDropdown(isOpen ? null : dropKey); }}
                          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${anySaved ? "bg-primary border-primary text-primary-foreground" : "glass-panel border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"}`}
                          title="Save to a list"
                          data-testid={`button-save-college-${college.rank}`}
                        >
                          {anySaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                        </button>
                        {isOpen && (
                          <div className="absolute right-0 top-11 z-30 glass-popover border border-border rounded-2xl shadow-xl w-48 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                            <p className="px-4 pt-3 pb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Save to</p>
                            <button
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
                              onClick={(e) => { e.stopPropagation(); toggleSavedCollege(college, result.major, result.description); }}
                            >
                              <div className={`w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 ${inSaved ? "bg-primary border-primary" : "border-border"}`}>
                                {inSaved && <Check className="w-3 h-3 text-primary-foreground" />}
                              </div>
                              <span className="text-sm font-medium text-foreground">Saved</span>
                            </button>
                            <button
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
                              onClick={(e) => { e.stopPropagation(); onToggleMyCollege(college, result.major); }}
                            >
                              <div className={`w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 ${inMyColleges ? "bg-primary border-primary" : "border-border"}`}>
                                {inMyColleges && <Check className="w-3 h-3 text-primary-foreground" />}
                              </div>
                              <span className="text-sm font-medium text-foreground">My Colleges</span>
                            </button>
                            <div className="h-2" />
                          </div>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
                      </div>
                    </div>
                    </RevealBorderGlow>
                  </TiltedCard>
                );
              })}
            </div>

            {pageCount > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3" data-testid="pagination-controls">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-border glass-panel text-sm font-medium text-foreground transition-all hover:border-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-sm text-muted-foreground tabular-nums px-2" data-testid="text-page-indicator">Page {currentPage + 1} of {pageCount}</span>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === pageCount - 1}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-border glass-panel text-sm font-medium text-foreground transition-all hover:border-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  data-testid="button-next-page"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedCollege && (
        <CurriculumModal college={selectedCollege} major={currentMajor} profile={profile} onClose={() => setSelectedCollege(null)} />
      )}
    </main>
  );
}
