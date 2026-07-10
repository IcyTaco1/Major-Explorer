import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Show } from "@clerk/react";
import {
  useGetMe, useUpdateMe, useListMyColleges, useCreateMyCollege, useDeleteMyCollege,
  useImportMyColleges, getListMyCollegesQueryKey, getGetMeQueryKey,
  useListSavedMajors, useUpsertSavedMajor, useDeleteSavedMajor, useImportSavedMajors,
  getListSavedMajorsQueryKey,
} from "@workspace/api-client-react";
import type { College, ProfileUpdate, CareerInfo, SavedMajorItem } from "@workspace/api-client-react";
import { Home, Sun, Moon, Settings } from "lucide-react";
import PillNav, { type PillNavItem } from "@/components/PillNav";
import ExploreView from "@/views/ExploreView";
import SuggestedView from "@/views/SuggestedView";
import CareersView from "@/views/CareersView";
import RoadmapView from "@/views/RoadmapView";
import CompareView, { type CompareMajorData } from "@/views/CompareView";
import MyCollegesView from "@/views/MyCollegesView";
import SavedView from "@/views/SavedView";
import AdminView from "@/views/AdminView";
import InterestQuiz from "@/views/InterestQuiz";
import QuizResults from "@/views/QuizResults";
import OnboardingProfile from "@/views/OnboardingProfile";
import SettingsDialog from "@/components/SettingsDialog";
import ChatWidget from "@/components/ChatWidget";
import UserMenu from "@/components/UserMenu";
import {
  loadSaved, loadProfile, persistProfile, loadMyColleges,
  MY_COLLEGES_KEY, SAVED_KEY, QUIZ_DONE_KEY, QUIZ_RESULTS_KEY,
  type SavedData, type SavedCollege, type UserProfile,
} from "@/lib/storage";
import {
  loadTheme, persistTheme, applyTheme, resolveTheme, systemPrefersDark, type Theme,
} from "@/lib/theme";
import type { MajorSuggestion } from "@/lib/quiz";
import { basePath } from "@/lib/basePath";
import { toast } from "@/hooks/use-toast";

type AppView = "explore" | "suggested" | "careers" | "roadmap" | "compare" | "colleges" | "saved" | "admin";

export default function AppShell() {
  const [view, setView] = useState<AppView>("explore");
  const [profile, setProfile] = useState<UserProfile>(loadProfile);
  const qc = useQueryClient();
  const meQuery = useGetMe();
  const isAdmin = meQuery.data?.isAdmin ?? false;
  const myCollegesQuery = useListMyColleges();
  const myColleges = useMemo(() => myCollegesQuery.data ?? [], [myCollegesQuery.data]);
  const createMyCollege = useCreateMyCollege();
  const deleteMyCollege = useDeleteMyCollege();
  const importMyColleges = useImportMyColleges();
  const savedMajorsQuery = useListSavedMajors();
  const upsertSavedMajor = useUpsertSavedMajor();
  const deleteSavedMajor = useDeleteSavedMajor();
  const importSavedMajors = useImportSavedMajors();
  const updateMe = useUpdateMe();
  const importAttemptedRef = useRef(false);
  const savedImportRef = useRef(false);

  const invalidateMyColleges = useCallback(() => {
    qc.invalidateQueries({ queryKey: getListMyCollegesQueryKey() });
  }, [qc]);
  const invalidateSavedMajors = useCallback(() => {
    qc.invalidateQueries({ queryKey: getListSavedMajorsQueryKey() });
  }, [qc]);

  // Server is the source of truth for saved (bookmarked) majors. Derive the
  // legacy SavedData shape from the query so the views stay unchanged.
  const saved = useMemo<SavedData>(() => {
    const out: SavedData = {};
    for (const row of savedMajorsQuery.data ?? []) {
      out[row.majorName] = {
        majorName: row.majorName,
        description: row.description,
        savedAt: Date.parse(row.savedAt) || 0,
        colleges: (row.colleges ?? []) as SavedCollege[],
        career: row.career,
      };
    }
    return out;
  }, [savedMajorsQuery.data]);

  // Read the freshest list straight from the query cache (not a closure over a
  // possibly-stale render) so rapid successive edits compute from prior
  // optimistic writes instead of clobbering each other (last-write-wins).
  const readSaved = useCallback(
    () => qc.getQueryData<SavedMajorItem[]>(getListSavedMajorsQueryKey()) ?? [],
    [qc],
  );
  const writeSavedOptimistic = useCallback(
    (
      majorName: string,
      patch: { description: string; career: CareerInfo | null; colleges: SavedCollege[] },
    ) => {
      qc.setQueryData<SavedMajorItem[]>(getListSavedMajorsQueryKey(), (prev) => {
        const arr = prev ?? [];
        const idx = arr.findIndex((r) => r.majorName === majorName);
        if (idx >= 0) {
          const next = arr.slice();
          next[idx] = { ...next[idx], ...patch };
          return next;
        }
        // Temp negative id until the refetch replaces it with the real row.
        return [{ id: -Date.now(), majorName, savedAt: new Date().toISOString(), ...patch }, ...arr];
      });
    },
    [qc],
  );

  const saveMajor = useCallback(
    (majorName: string, description: string, career?: CareerInfo | null) => {
      const existing = readSaved().find((r) => r.majorName === majorName);
      const colleges = (existing?.colleges ?? []) as SavedCollege[];
      const resolvedCareer = career ?? existing?.career ?? null;
      writeSavedOptimistic(majorName, { description, career: resolvedCareer, colleges });
      upsertSavedMajor.mutate(
        { data: { majorName, description, career: resolvedCareer, colleges } },
        { onSuccess: invalidateSavedMajors },
      );
    },
    [readSaved, writeSavedOptimistic, upsertSavedMajor, invalidateSavedMajors],
  );

  const unsaveMajor = useCallback(
    (majorName: string) => {
      const id = readSaved().find((r) => r.majorName === majorName)?.id;
      qc.setQueryData<SavedMajorItem[]>(getListSavedMajorsQueryKey(), (prev) =>
        (prev ?? []).filter((r) => r.majorName !== majorName),
      );
      // Negative id = optimistic row not yet persisted; refetch to get the real one.
      if (id == null || id < 0) { invalidateSavedMajors(); return; }
      deleteSavedMajor.mutate({ id }, { onSuccess: invalidateSavedMajors });
    },
    [readSaved, qc, deleteSavedMajor, invalidateSavedMajors],
  );

  const toggleSavedCollege = useCallback(
    (college: College, majorName: string, description: string, career?: CareerInfo | null) => {
      const existing = readSaved().find((r) => r.majorName === majorName);
      const current = (existing?.colleges ?? []) as SavedCollege[];
      const already = current.some((c) => c.name === college.name);
      const nextColleges: SavedCollege[] = already
        ? current.filter((c) => c.name !== college.name)
        : [...current, { ...college, savedAt: Date.now() }];
      const resolvedDescription = existing?.description ?? description;
      const resolvedCareer = existing?.career ?? career ?? null;
      writeSavedOptimistic(majorName, {
        description: resolvedDescription,
        career: resolvedCareer,
        colleges: nextColleges,
      });
      upsertSavedMajor.mutate(
        { data: { majorName, description: resolvedDescription, career: resolvedCareer, colleges: nextColleges } },
        { onSuccess: invalidateSavedMajors },
      );
    },
    [readSaved, writeSavedOptimistic, upsertSavedMajor, invalidateSavedMajors],
  );

  const unsaveCollege = useCallback(
    (majorName: string, collegeName: string) => {
      const existing = readSaved().find((r) => r.majorName === majorName);
      if (!existing) return;
      const nextColleges = ((existing.colleges ?? []) as SavedCollege[]).filter(
        (c) => c.name !== collegeName,
      );
      const resolvedCareer = existing.career ?? null;
      writeSavedOptimistic(majorName, {
        description: existing.description,
        career: resolvedCareer,
        colleges: nextColleges,
      });
      upsertSavedMajor.mutate(
        { data: { majorName, description: existing.description, career: resolvedCareer, colleges: nextColleges } },
        { onSuccess: invalidateSavedMajors },
      );
    },
    [readSaved, writeSavedOptimistic, upsertSavedMajor, invalidateSavedMajors],
  );

  // Persist profile / quiz changes to the account (server is source of truth).
  // Resolves true on success; on failure shows a toast and resolves false.
  const pushProfileUpdate = useCallback(async (data: ProfileUpdate): Promise<boolean> => {
    try {
      await updateMe.mutateAsync({ data });
      qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      return true;
    } catch {
      toast({
        variant: "destructive",
        title: "Couldn't sync to your account",
        description: "Your changes are kept on this device. Check your connection and try saving again.",
      });
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateMe.mutateAsync, qc]);

  // One-time migration: move colleges saved in localStorage (pre-accounts) into the DB.
  useEffect(() => {
    if (!myCollegesQuery.isSuccess || importAttemptedRef.current) return;
    importAttemptedRef.current = true;
    const local = loadMyColleges();
    if (local.length === 0) return;
    const items = local
      .filter((c) => typeof c?.name === "string" && typeof c?.majorName === "string")
      .map((c) => {
        const { majorName, savedAt, ...college } = c;
        void savedAt;
        return { major: majorName, collegeName: college.name, college };
      });
    if (items.length === 0) { localStorage.removeItem(MY_COLLEGES_KEY); return; }
    importMyColleges.mutate(
      { data: { items } },
      {
        onSuccess: () => {
          localStorage.removeItem(MY_COLLEGES_KEY);
          invalidateMyColleges();
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myCollegesQuery.isSuccess]);

  // One-time migration: move majors bookmarked in localStorage (pre-accounts)
  // into the DB, then drop the local copy. Existing server rows win.
  useEffect(() => {
    if (!savedMajorsQuery.isSuccess || savedImportRef.current) return;
    savedImportRef.current = true;
    const local = Object.values(loadSaved());
    const items = local
      .filter((m) => m && typeof m.majorName === "string")
      .map((m) => ({
        majorName: m.majorName,
        description: m.description ?? "",
        career: m.career ?? null,
        colleges: (m.colleges ?? []).slice(0, 15),
      }));
    if (items.length === 0) { localStorage.removeItem(SAVED_KEY); return; }
    importSavedMajors.mutate(
      { data: { items: items.slice(0, 100) } },
      {
        onSuccess: () => {
          localStorage.removeItem(SAVED_KEY);
          invalidateSavedMajors();
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedMajorsQuery.isSuccess]);

  const toggleMyCollege = useCallback((college: College, majorName: string) => {
    const existing = myColleges.find((c) => c.collegeName === college.name && c.major === majorName);
    if (existing) {
      deleteMyCollege.mutate({ id: existing.id }, { onSuccess: invalidateMyColleges });
    } else {
      createMyCollege.mutate(
        { data: { major: majorName, collegeName: college.name, college } },
        { onSuccess: invalidateMyColleges },
      );
    }
  }, [myColleges, createMyCollege, deleteMyCollege, invalidateMyColleges]);

  const compareMajors = useMemo<CompareMajorData[]>(
    () => Object.values(saved).map((m) => ({
      majorName: m.majorName,
      description: m.description,
      colleges: m.colleges,
      career: m.career ?? null,
    })),
    [saved],
  );
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => resolveTheme(loadTheme()));
  const changeTheme = useCallback((next: Theme) => {
    setTheme(next);
    persistTheme(next);
    applyTheme(next);
    setResolvedTheme(resolveTheme(next));
  }, []);
  const toggleTheme = () => changeTheme(resolvedTheme === "dark" ? "light" : "dark");
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      applyTheme("system");
      setResolvedTheme(systemPrefersDark() ? "dark" : "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);
  const [quizState, setQuizState] = useState<"quiz" | "profile" | "results" | "done">(() =>
    localStorage.getItem(QUIZ_DONE_KEY) ? "done" : "quiz"
  );
  const [quizResults, setQuizResults] = useState<MajorSuggestion[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(QUIZ_RESULTS_KEY) ?? "[]");
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((r: unknown) => typeof r === "string" || (!!r && typeof (r as MajorSuggestion).major === "string"))
        .map((r: unknown): MajorSuggestion =>
          typeof r === "string"
            ? { major: r, reason: "" }
            : { major: (r as MajorSuggestion).major, reason: String((r as MajorSuggestion).reason ?? "") }
        );
    } catch { return []; }
  });
  const [exploreInitialMajor, setExploreInitialMajor] = useState<string | undefined>();

  // One-time reconciliation once the server profile loads: server data wins;
  // anything that only exists locally (pre-sync) is imported into the account.
  const profileSyncedRef = useRef(false);
  useEffect(() => {
    if (!meQuery.isSuccess || profileSyncedRef.current) return;
    profileSyncedRef.current = true;
    const me = meQuery.data;
    const updates: ProfileUpdate = {};

    const serverHasProfile =
      me.gpa != null || me.sat != null || me.act != null || me.goals.trim() !== "";
    if (serverHasProfile) {
      const merged: UserProfile = { gpa: me.gpa, sat: me.sat, act: me.act, goals: me.goals };
      setProfile(merged);
      persistProfile(merged);
    } else {
      const local = loadProfile();
      if (local.gpa != null || local.sat != null || local.act != null || local.goals.trim() !== "") {
        updates.gpa = local.gpa;
        updates.sat = local.sat;
        updates.act = local.act;
        updates.goals = local.goals;
      }
    }

    if (me.quizResults.length > 0) {
      setQuizResults(me.quizResults);
      localStorage.setItem(QUIZ_RESULTS_KEY, JSON.stringify(me.quizResults));
    } else if (quizResults.length > 0) {
      updates.quizResults = quizResults;
    }

    if (me.quizDone) {
      localStorage.setItem(QUIZ_DONE_KEY, "1");
      setQuizState("done");
    } else if (localStorage.getItem(QUIZ_DONE_KEY)) {
      updates.quizDone = true;
    }

    if (Object.keys(updates).length > 0) pushProfileUpdate(updates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meQuery.isSuccess]);

  const savedMajorCount = Object.keys(saved).length;
  const savedCollegeCount = myColleges.length;

  const handleQuizComplete = (majors: MajorSuggestion[]) => {
    setQuizResults(majors);
    localStorage.setItem(QUIZ_RESULTS_KEY, JSON.stringify(majors));
    pushProfileUpdate({ quizResults: majors });
    setQuizState("profile");
  };

  const handleProfileComplete = (p: UserProfile) => {
    setProfile(p); persistProfile(p);
    pushProfileUpdate({ gpa: p.gpa, sat: p.sat, act: p.act, goals: p.goals });
    setQuizState("results");
  };
  const handleProfileSkip = () => setQuizState("results");
  const handleSaveProfile = (p: UserProfile) => {
    setProfile(p); persistProfile(p);
    return pushProfileUpdate({ gpa: p.gpa, sat: p.sat, act: p.act, goals: p.goals });
  };

  const handleExploreMajor = (major: string) => {
    localStorage.setItem(QUIZ_DONE_KEY, "1");
    setQuizState("done");
    pushProfileUpdate({ quizDone: true });
    setExploreInitialMajor(major);
    setView("explore");
  };

  const handleDismissQuiz = () => {
    localStorage.setItem(QUIZ_DONE_KEY, "1");
    setQuizState("done");
    pushProfileUpdate({ quizDone: true });
  };

  const handleRetakeQuiz = () => {
    localStorage.removeItem(QUIZ_DONE_KEY);
    setQuizState("quiz");
    pushProfileUpdate({ quizDone: false });
  };

  // Don't flash the quiz while we're still finding out whether this user
  // already completed it on another device.
  if (quizState === "quiz" && meQuery.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-muted border-t-primary animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (quizState === "quiz") {
    return <InterestQuiz onComplete={handleQuizComplete} />;
  }

  if (quizState === "profile") {
    return <OnboardingProfile initial={profile} onComplete={handleProfileComplete} onSkip={handleProfileSkip} />;
  }

  if (quizState === "results") {
    return (
      <QuizResults
        majors={quizResults}
        onExplore={handleExploreMajor}
        onDismiss={handleDismissQuiz}
      />
    );
  }

  const navItems: PillNavItem<AppView>[] = [
    { id: "explore", label: "Explore" },
    { id: "suggested", label: "Suggested" },
    { id: "careers", label: "Careers" },
    { id: "roadmap", label: "Roadmap" },
    { id: "compare", label: "Compare" },
    { id: "colleges", label: "My Colleges", count: savedCollegeCount },
    { id: "saved", label: "Saved", count: savedMajorCount },
  ];
  if (isAdmin) navItems.push({ id: "admin", label: "Admin" });

  return (
    <div className="min-h-screen w-full flex flex-col">
      <header className="w-full px-4 sm:px-6 lg:px-12 py-3 lg:py-4 border-b border-border glass-panel shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between gap-2">
          <PillNav
            logoSrc={`${basePath}/logo.svg`}
            logoAlt="Next Steps"
            activeId={view}
            onSelect={(id) => setView(id)}
            onLogoClick={() => setView("explore")}
            items={navItems}
          />
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => { setExploreInitialMajor(undefined); setView("explore"); }}
              className="w-9 h-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
              title="Home"
              data-testid="button-home"
            >
              <Home className="w-4 h-4" />
            </button>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
              title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              data-testid="button-toggle-theme"
            >
              {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="w-9 h-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
              title="Settings"
              data-testid="button-open-settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <Show when="signed-in">
              <div className="w-px h-5 bg-border mx-1" />
              <UserMenu />
            </Show>
          </div>
        </div>
      </header>

      {view === "explore" && (
        <ExploreView
          saved={saved}
          onSaveMajor={saveMajor}
          onUnsaveMajor={unsaveMajor}
          onToggleSavedCollege={toggleSavedCollege}
          myColleges={myColleges} onToggleMyCollege={toggleMyCollege}
          initialMajor={exploreInitialMajor}
          userGpa={profile.gpa}
          profile={profile}
        />
      )}
      {view === "suggested" && (
        <SuggestedView
          results={quizResults}
          onExplore={(major) => { setExploreInitialMajor(major); setView("explore"); }}
          onRetake={handleRetakeQuiz}
        />
      )}
      {view === "careers" && <CareersView />}
      {view === "roadmap" && <RoadmapView />}
      {view === "compare" && <CompareView majors={compareMajors} userGpa={profile.gpa} />}
      {view === "colleges" && <MyCollegesView userGpa={profile.gpa} />}
      {view === "saved" && (
        <SavedView saved={saved} loading={savedMajorsQuery.isLoading} onUnsaveMajor={unsaveMajor} onUnsaveCollege={unsaveCollege} userGpa={profile.gpa} />
      )}
      {view === "admin" && (isAdmin ? <AdminView /> : null)}

      {showSettings && (
        <SettingsDialog
          initial={profile}
          onSaveProfile={handleSaveProfile}
          theme={theme}
          onChangeTheme={changeTheme}
          onRetakeQuiz={handleRetakeQuiz}
          onClose={() => setShowSettings(false)}
        />
      )}
      <ChatWidget />
    </div>
  );
}
