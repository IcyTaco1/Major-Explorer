import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLookupMajor, useGetMajorCurriculum } from "@workspace/api-client-react";
import type { College, CurriculumResponse } from "@workspace/api-client-react";
import { Search, GraduationCap, MapPin, Compass, AlertCircle, X, ChevronRight } from "lucide-react";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

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
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 md:p-8 border-b border-slate-100 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{major}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-serif font-bold text-slate-900 leading-tight">
              {college.name}
            </h2>
            <div className="flex items-center text-slate-500 mt-1 text-sm">
              <MapPin className="w-3.5 h-3.5 mr-1" />
              {college.location}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-6 md:p-8">
          {isLoading && (
            <div className="space-y-6 animate-pulse">
              <div className="h-5 bg-slate-100 rounded w-48 mb-2" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-100 p-5 space-y-3">
                  <div className="h-5 bg-slate-100 rounded w-32" />
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="space-y-2 mt-4">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-4 bg-slate-100 rounded w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
              <p className="text-slate-700 font-medium">Could not load the curriculum.</p>
              <p className="text-slate-500 text-sm mt-1">Please close and try again.</p>
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
                      <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${colors.badge}`}>
                        {year.label}
                      </span>
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

function Home() {
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

  const isIdle = lookupMajor.isIdle && !lookupMajor.data;
  const isLoading = lookupMajor.isPending;
  const isError = lookupMajor.isError;
  const result = lookupMajor.data;

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col">
      <header className="w-full py-5 px-6 lg:px-12 flex items-center justify-between border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 text-slate-900">
          <Compass className="w-5 h-5 text-slate-700" />
          <span className="font-serif font-semibold text-lg tracking-tight">Prospectus</span>
        </div>
      </header>

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
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Explore"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="w-full max-w-4xl">
          {/* Welcome / Suggested Majors */}
          {isIdle && (
            <div className="flex flex-col items-center justify-center animate-in fade-in duration-500 delay-300 fill-mode-both">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Suggested Majors</p>
              <div className="flex flex-wrap justify-center gap-3">
                {["Finance", "Computer Science", "Nursing", "Psychology", "Mechanical Engineering"].map((major) => (
                  <button
                    key={major}
                    onClick={() => setSuggestedMajor(major)}
                    className="px-5 py-2.5 bg-white border border-slate-200 rounded-full text-slate-700 hover:border-slate-400 hover:shadow-sm transition-all"
                  >
                    {major}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="w-full animate-in fade-in duration-300">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12 mb-8">
                <div className="h-10 bg-slate-100 rounded w-1/3 mb-6 animate-pulse" />
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${85 + Math.random() * 15}%` }} />
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-8 bg-slate-100 rounded w-48 mb-2 animate-pulse" />
                {[...Array(5)].map((_, i) => (
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

          {/* Error State */}
          {isError && (
            <div className="w-full bg-red-50 border border-red-100 rounded-2xl p-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
              <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
              <h3 className="text-xl font-serif text-red-900 mb-2">Could not load results</h3>
              <p className="text-red-700 max-w-md">
                We had trouble looking that up. Please check the spelling and try again.
              </p>
            </div>
          )}

          {/* Results */}
          {!isLoading && !isError && result && (
            <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
              {/* Description Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12 mb-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none" />
                <h2 className="text-3xl md:text-4xl font-serif text-slate-900 mb-5 font-bold relative z-10">
                  {result.major}
                </h2>
                <p
                  className="text-lg leading-relaxed text-slate-700 relative z-10"
                  data-testid="text-major-description"
                >
                  {result.description}
                </p>
              </div>

              {/* Colleges Header */}
              <div className="mb-4 flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-slate-800" />
                <h3 className="text-2xl font-serif text-slate-900 font-bold">Top Colleges</h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">Click on any college to see its 4-year course plan.</p>

              {/* College Cards */}
              <div className="space-y-4" data-testid="list-top-colleges">
                {result.topColleges.map((college, index) => (
                  <button
                    key={college.rank}
                    className={`w-full text-left bg-white rounded-2xl border border-slate-200 p-5 md:p-6 transition-all duration-200 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 flex gap-4 md:gap-6 group cursor-pointer animate-in fade-in slide-in-from-bottom-4 stagger-${index + 1} fill-mode-both`}
                    data-testid={`item-college-${college.rank}`}
                    onClick={() => setSelectedCollege(college)}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-slate-50 text-slate-800 font-serif font-bold text-xl md:text-2xl flex items-center justify-center border border-slate-100 shadow-sm">
                        #{college.rank}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-slate-700 transition-colors">
                        {college.name}
                      </h4>
                      <div className="flex items-center text-slate-500 mb-3 text-sm font-medium">
                        <MapPin className="w-4 h-4 mr-1.5 opacity-70" />
                        {college.location}
                      </div>
                      <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                        {college.highlights}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center pl-2 md:pl-4 md:border-l md:border-slate-100">
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Curriculum Modal */}
      {selectedCollege && (
        <CurriculumModal
          college={selectedCollege}
          major={currentMajor}
          onClose={() => setSelectedCollege(null)}
        />
      )}
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
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
