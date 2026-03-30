import { useState, useRef, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLookupMajor } from "@workspace/api-client-react";
import { Search, GraduationCap, MapPin, BookOpen, AlertCircle, ChevronRight } from "lucide-react";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Home() {
  const [inputValue, setInputValue] = useState("");
  const lookupMajor = useLookupMajor();
  
  const handleSearch = () => {
    if (!inputValue.trim()) return;
    lookupMajor.mutate({ data: { major: inputValue } });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const setSuggestedMajor = (major: string) => {
    setInputValue(major);
    lookupMajor.mutate({ data: { major } });
  };

  const isIdle = lookupMajor.isIdle && !lookupMajor.data;
  const isLoading = lookupMajor.isPending;
  const isError = lookupMajor.isError;
  const result = lookupMajor.data;

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col">
      <header className="w-full py-6 px-6 lg:px-12 flex items-center justify-between border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 text-slate-900">
          <BookOpen className="w-6 h-6 text-slate-700" />
          <span className="font-serif font-semibold text-xl tracking-tight">Major Explorer</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center pt-16 md:pt-24 px-4 pb-24">
        {/* Search Header */}
        <div className="w-full max-w-3xl flex flex-col items-center text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-slate-900 font-bold mb-6 leading-tight">
            Discover your academic path.
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mb-10">
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
          {/* Welcome State */}
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
                  <div className="h-4 bg-slate-100 rounded w-full animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded w-full animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded w-11/12 animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded w-full animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded w-4/5 animate-pulse" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="h-8 bg-slate-100 rounded w-48 mb-6 animate-pulse" />
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex gap-6 animate-pulse">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-slate-100 rounded w-1/4" />
                      <div className="h-4 bg-slate-100 rounded w-1/5" />
                      <div className="h-4 bg-slate-100 rounded w-3/4 mt-4" />
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
                We encountered an issue while looking up information for this major. Please check your spelling and try again.
              </p>
            </div>
          )}

          {/* Results State */}
          {!isLoading && !isError && result && (
            <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12 mb-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none" />
                <h2 className="text-3xl md:text-4xl font-serif text-slate-900 mb-6 font-bold relative z-10">
                  {result.major}
                </h2>
                <p 
                  className="text-lg leading-relaxed text-slate-700 relative z-10"
                  data-testid="text-major-description"
                >
                  {result.description}
                </p>
              </div>

              <div className="mb-6 flex items-center gap-3">
                <GraduationCap className="w-6 h-6 text-slate-800" />
                <h3 className="text-2xl font-serif text-slate-900 font-bold">
                  Top Colleges
                </h3>
              </div>

              <div className="space-y-4" data-testid="list-top-colleges">
                {result.topColleges.map((college, index) => (
                  <div 
                    key={college.rank}
                    className={`bg-white rounded-2xl border border-slate-200 p-5 md:p-6 transition-all duration-300 hover:shadow-md hover:border-slate-300 hover:-translate-y-1 flex flex-col md:flex-row gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 stagger-${index + 1} fill-mode-both`}
                    data-testid={`item-college-${college.rank}`}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-slate-50 text-slate-800 font-serif font-bold text-xl md:text-2xl flex items-center justify-center border border-slate-100 shadow-sm">
                        #{college.rank}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xl font-bold text-slate-900 mb-1 truncate" title={college.name}>
                        {college.name}
                      </h4>
                      <div className="flex items-center text-slate-500 mb-3 text-sm font-medium">
                        <MapPin className="w-4 h-4 mr-1.5 opacity-70" />
                        {college.location}
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        {college.highlights}
                      </p>
                    </div>
                    <div className="hidden md:flex flex-shrink-0 items-center justify-center pl-4 border-l border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                       <ChevronRight className="w-6 h-6 text-slate-300" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
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
