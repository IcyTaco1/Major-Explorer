import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLookupMajor, useGetMajorCurriculum, useChat, useGetCareers } from "@workspace/api-client-react";
import type { College, CurriculumResponse, ChatMessage, CareerInfo } from "@workspace/api-client-react";
import {
  Search, GraduationCap, MapPin, Milestone, AlertCircle, X,
  ChevronRight, ChevronDown, ChevronUp, Bookmark, BookmarkCheck,
  Trash2, SortAsc, MessageCircle, Send, Bot, Check, DollarSign,
  LogOut, User, ChevronLeft, Sparkles, TrendingUp, Award, ExternalLink, Briefcase,
  Settings, SlidersHorizontal, RotateCcw, Sun, Moon, Monitor, Palette, ShieldCheck, UserCog, BarChart3, type LucideIcon
} from "lucide-react";
import NotFound from "@/pages/not-found";

// ─── Clerk setup ──────────────────────────────────────────────────────
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

if (!clerkPubKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#0f172a",
    colorForeground: "#0f172a",
    colorMutedForeground: "#64748b",
    colorDanger: "#ef4444",
    colorBackground: "#ffffff",
    colorInput: "#f8fafc",
    colorInputForeground: "#0f172a",
    colorNeutral: "#e2e8f0",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-serif font-bold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-foreground font-semibold hover:text-foreground",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-foreground",
    formFieldSuccessText: "text-green-600",
    alertText: "text-foreground",
    logoBox: "flex justify-center mb-2",
    logoImage: "w-10 h-10",
    socialButtonsBlockButton: "border border-border hover:bg-muted",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold",
    formFieldInput: "bg-background border-border text-foreground focus:border-ring focus:ring-ring",
    footerAction: "border-t border-border",
    dividerLine: "bg-border",
    alert: "bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50",
    otpCodeFieldInput: "bg-background border-border text-foreground focus:border-ring focus:ring-ring",
    formFieldRow: "",
    main: "",
  },
  signUp: {
    elements: {
      socialButtons: "hidden",
      socialButtonsBlockButton: "hidden",
      socialButtonsIconButton: "hidden",
      dividerRow: "hidden",
    },
  },
};

// ─── QueryClient ──────────────────────────────────────────────────────
const queryClient = new QueryClient();

// ─── Types & Storage ─────────────────────────────────────────────────
interface SavedCollege extends College { savedAt: number; }
interface SavedMajor {
  majorName: string;
  description: string;
  savedAt: number;
  colleges: SavedCollege[];
}
type SavedData = Record<string, SavedMajor>;

interface MyCollege extends College {
  majorName: string;
  savedAt: number;
}

const SAVED_KEY = "declare-saved-majors";
const MY_COLLEGES_KEY = "next-steps-my-colleges";
const QUIZ_DONE_KEY = "next-steps-quiz-done";
const QUIZ_RESULTS_KEY = "next-steps-quiz-results";

function loadSaved(): SavedData {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "{}") ?? {}; }
  catch { return {}; }
}
function persistSaved(data: SavedData) { localStorage.setItem(SAVED_KEY, JSON.stringify(data)); }
function loadMyColleges(): MyCollege[] {
  try { return JSON.parse(localStorage.getItem(MY_COLLEGES_KEY) ?? "[]") ?? []; }
  catch { return []; }
}
function persistMyColleges(data: MyCollege[]) { localStorage.setItem(MY_COLLEGES_KEY, JSON.stringify(data)); }

// User profile (GPA + goals). Stored ONLY in localStorage — the GPA is never
// sent to the server or logged anywhere.
interface UserProfile {
  gpa: number | null;
  sat: number | null;
  act: number | null;
  goals: string;
}
const PROFILE_KEY = "next-steps-profile";
const EMPTY_PROFILE: UserProfile = { gpa: null, sat: null, act: null, goals: "" };
function loadProfile(): UserProfile {
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return { ...EMPTY_PROFILE };
    const r = raw as Partial<UserProfile>;
    const inRange = (v: unknown, lo: number, hi: number): number | null =>
      typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : null;
    return {
      gpa: inRange(r.gpa, 0, 4),
      sat: inRange(r.sat, 400, 1600),
      act: inRange(r.act, 1, 36),
      goals: typeof r.goals === "string" ? r.goals : "",
    };
  } catch { return { ...EMPTY_PROFILE }; }
}
function persistProfile(data: UserProfile) { localStorage.setItem(PROFILE_KEY, JSON.stringify(data)); }

const THEME_KEY = "next-steps-theme";
type Theme = "light" | "dark" | "system";
function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}
function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;
}
function loadTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light" || saved === "system") return saved;
  return "system";
}
function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", resolveTheme(theme) === "dark");
}
function persistTheme(theme: Theme) { localStorage.setItem(THEME_KEY, theme); }
if (typeof document !== "undefined") applyTheme(loadTheme());

// ─── Interest Quiz ────────────────────────────────────────────────────
interface QuizQuestion {
  id: string;
  question: string;
  options: { label: string; value: string }[];
}

// Five indirect, scenario-based quiz versions. Each version asks about the same
// five dimensions (activity, environment, strength, impact, subject) using the
// same answer `value`s, so getMajorSuggestions works identically across them.
const QUIZ_VERSIONS: QuizQuestion[][] = [
  // ── Version 1 · "A day in your life" ──────────────────────────────────
  [
    {
      id: "activity",
      question: "You finally have a free weekend. What are you itching to do?",
      options: [
        { label: "Take something apart to see how it works", value: "building" },
        { label: "Show up for a friend who needs me", value: "helping" },
        { label: "Get lost in a puzzle or strategy game", value: "analyzing" },
        { label: "Write, paint, film, or design something", value: "creating" },
        { label: "Plan an event or start a side hustle", value: "leading" },
      ],
    },
    {
      id: "environment",
      question: "Picture the space where you feel most 'in the zone.'",
      options: [
        { label: "A quiet lab surrounded by experiments", value: "lab" },
        { label: "Outdoors, moving between people and places", value: "field" },
        { label: "A cozy desk with my screens and headphones", value: "desk" },
        { label: "A busy clinic helping people one-on-one", value: "clinic" },
        { label: "A new city every few months — no fixed desk", value: "anywhere" },
      ],
    },
    {
      id: "strength",
      question: "Your friends always come to you for…?",
      options: [
        { label: "Cracking a tricky logic or numbers problem", value: "math" },
        { label: "Putting their messy thoughts into words", value: "writing" },
        { label: "A listening ear and honest advice", value: "empathy" },
        { label: "Making something look amazing", value: "design" },
        { label: "Getting them organized and on track", value: "planning" },
      ],
    },
    {
      id: "impact",
      question: "In 20 years, you'd be proudest if you had…?",
      options: [
        { label: "Invented something that pushes tech forward", value: "science" },
        { label: "Helped thousands live healthier lives", value: "health" },
        { label: "Changed a law that makes life fairer", value: "policy" },
        { label: "Built a business that created jobs", value: "economy" },
        { label: "Moved people with a story or work of art", value: "art" },
      ],
    },
    {
      id: "subject",
      question: "Which class never really felt like work?",
      options: [
        { label: "Science labs (Bio, Chem, Physics)", value: "science" },
        { label: "Math problem sets", value: "math" },
        { label: "English and literature discussions", value: "english" },
        { label: "History and social studies debates", value: "history" },
        { label: "Art, music, or theater", value: "art" },
      ],
    },
  ],
  // ── Version 2 · "Startup roleplay" ────────────────────────────────────
  [
    {
      id: "activity",
      question: "You join a scrappy startup. Which role do you grab first?",
      options: [
        { label: "The one who builds the actual product", value: "building" },
        { label: "The one who supports the team and customers", value: "helping" },
        { label: "The one who reads the data and finds insights", value: "analyzing" },
        { label: "The one who shapes the brand and content", value: "creating" },
        { label: "The one who sets the vision and runs it", value: "leading" },
      ],
    },
    {
      id: "environment",
      question: "On the office tour, which room makes you go 'yes, this one'?",
      options: [
        { label: "The research lab full of equipment", value: "lab" },
        { label: "There's no office — you're always on site", value: "field" },
        { label: "The quiet focus pods with big monitors", value: "desk" },
        { label: "The care rooms where people get helped", value: "clinic" },
        { label: "The airport lounge — you work while traveling", value: "anywhere" },
      ],
    },
    {
      id: "strength",
      question: "A group project is falling apart. What do you bring?",
      options: [
        { label: "Logic to crack the hard technical part", value: "math" },
        { label: "Clear writing to pull it all together", value: "writing" },
        { label: "Calm to keep everyone getting along", value: "empathy" },
        { label: "A creative spark to make it stand out", value: "design" },
        { label: "A plan and timeline to save it", value: "planning" },
      ],
    },
    {
      id: "impact",
      question: "A genie grants one change to the world. You pick…?",
      options: [
        { label: "Faster scientific breakthroughs", value: "science" },
        { label: "Healthier people everywhere", value: "health" },
        { label: "Fairer laws and systems", value: "policy" },
        { label: "Opportunity and jobs for all", value: "economy" },
        { label: "More beauty, stories, and culture", value: "art" },
      ],
    },
    {
      id: "subject",
      question: "Flipping through old report cards, your eyes light up at…?",
      options: [
        { label: "Science", value: "science" },
        { label: "Math", value: "math" },
        { label: "English / Literature", value: "english" },
        { label: "History / Social Studies", value: "history" },
        { label: "Art, Music, or Theater", value: "art" },
      ],
    },
  ],
  // ── Version 3 · "Media & vibes" ───────────────────────────────────────
  [
    {
      id: "activity",
      question: "What kind of video rabbit hole do you fall into?",
      options: [
        { label: "How things are made / engineering builds", value: "building" },
        { label: "Heartwarming stories and self-improvement", value: "helping" },
        { label: "Deep-dive explainers and breakdowns", value: "analyzing" },
        { label: "Art, film-making, and creative tutorials", value: "creating" },
        { label: "Business, startups, and success stories", value: "leading" },
      ],
    },
    {
      id: "environment",
      question: "Your ideal commute ends at…?",
      options: [
        { label: "A lab with your name on a project", value: "lab" },
        { label: "Wherever the work takes you that day", value: "field" },
        { label: "A calm room with your setup dialed in", value: "desk" },
        { label: "A place where people are waiting for your help", value: "clinic" },
        { label: "A different time zone — you work remote", value: "anywhere" },
      ],
    },
    {
      id: "strength",
      question: "Pick the 'superpower' that already feels kind of real for you:",
      options: [
        { label: "Solving any number or logic puzzle", value: "math" },
        { label: "Saying exactly the right thing", value: "writing" },
        { label: "Sensing how someone really feels", value: "empathy" },
        { label: "Seeing the beauty in everything", value: "design" },
        { label: "Turning chaos into a clean plan", value: "planning" },
      ],
    },
    {
      id: "impact",
      question: "Which headline would you most want to be about you?",
      options: [
        { label: "'Breakthrough discovery changes the field'", value: "science" },
        { label: "'New approach saves countless lives'", value: "health" },
        { label: "'Landmark law passes after years of work'", value: "policy" },
        { label: "'Company hits milestone, hiring thousands'", value: "economy" },
        { label: "'Debut work captivates audiences everywhere'", value: "art" },
      ],
    },
    {
      id: "subject",
      question: "Which homework did you secretly enjoy?",
      options: [
        { label: "Science labs and reports", value: "science" },
        { label: "Math problem sets", value: "math" },
        { label: "Essays and reading", value: "english" },
        { label: "History projects", value: "history" },
        { label: "Studio or performance work", value: "art" },
      ],
    },
  ],
  // ── Version 4 · "Desert island" ───────────────────────────────────────
  [
    {
      id: "activity",
      question: "Stranded on an island with a group — what's your job?",
      options: [
        { label: "Build the shelter and tools", value: "building" },
        { label: "Keep everyone's spirits and health up", value: "helping" },
        { label: "Map the island and ration resources", value: "analyzing" },
        { label: "Document the journey and keep morale high", value: "creating" },
        { label: "Take charge and coordinate everyone", value: "leading" },
      ],
    },
    {
      id: "environment",
      question: "Where do you do your best thinking?",
      options: [
        { label: "Somewhere precise and controlled", value: "lab" },
        { label: "Out in the real world, hands-on", value: "field" },
        { label: "Alone with my screen and zero distractions", value: "desk" },
        { label: "Around people who need me", value: "clinic" },
        { label: "On the move — trains, planes, cafes", value: "anywhere" },
      ],
    },
    {
      id: "strength",
      question: "What's the compliment you get most often?",
      options: [
        { label: "'You're so logical'", value: "math" },
        { label: "'You explain things really well'", value: "writing" },
        { label: "'You really get me'", value: "empathy" },
        { label: "'You have great taste'", value: "design" },
        { label: "'You're so organized'", value: "planning" },
      ],
    },
    {
      id: "impact",
      question: "What problem keeps you up at night wanting to fix it?",
      options: [
        { label: "Unsolved science and tech challenges", value: "science" },
        { label: "People suffering from illness", value: "health" },
        { label: "Unfair rules and broken systems", value: "policy" },
        { label: "Lack of jobs and opportunity", value: "economy" },
        { label: "A world that needs more beauty and stories", value: "art" },
      ],
    },
    {
      id: "subject",
      question: "If school had only one subject forever, you'd pick…?",
      options: [
        { label: "Science", value: "science" },
        { label: "Math", value: "math" },
        { label: "English / Literature", value: "english" },
        { label: "History / Social Studies", value: "history" },
        { label: "Art / Music / Theater", value: "art" },
      ],
    },
  ],
  // ── Version 5 · "Your phone & browser tabs" ───────────────────────────
  [
    {
      id: "activity",
      question: "Your phone's most-used app is probably…?",
      options: [
        { label: "A tinkering, DIY, or coding app", value: "building" },
        { label: "Messaging — I'm always checking on people", value: "helping" },
        { label: "A stats, finance, or strategy app", value: "analyzing" },
        { label: "A photo, video, or design app", value: "creating" },
        { label: "A productivity or business app", value: "leading" },
      ],
    },
    {
      id: "environment",
      question: "A dream job listing pops up. Which location line sells you?",
      options: [
        { label: "'On-site research laboratory'", value: "lab" },
        { label: "'Fieldwork / travel required'", value: "field" },
        { label: "'Remote, deep-focus role'", value: "desk" },
        { label: "'Hospital / clinical setting'", value: "clinic" },
        { label: "'Work from anywhere in the world'", value: "anywhere" },
      ],
    },
    {
      id: "strength",
      question: "You've got 50 browser tabs open. Most are about…?",
      options: [
        { label: "Puzzles, data, and how things work", value: "math" },
        { label: "Articles, blogs, and things to read", value: "writing" },
        { label: "Advice, relationships, and people", value: "empathy" },
        { label: "Design inspiration and aesthetics", value: "design" },
        { label: "To-do systems and planners", value: "planning" },
      ],
    },
    {
      id: "impact",
      question: "You're given a TED talk. Your topic is…?",
      options: [
        { label: "The next big scientific frontier", value: "science" },
        { label: "How we can all live healthier", value: "health" },
        { label: "Fixing a broken system", value: "policy" },
        { label: "Building businesses that lift people up", value: "economy" },
        { label: "Why stories and art matter", value: "art" },
      ],
    },
    {
      id: "subject",
      question: "Which textbook would you actually keep?",
      options: [
        { label: "Science", value: "science" },
        { label: "Math", value: "math" },
        { label: "English / Literature", value: "english" },
        { label: "History / Social Studies", value: "history" },
        { label: "Art / Music / Theater", value: "art" },
      ],
    },
  ],
];

// Top 8 most-awarded U.S. bachelor's degree fields, in exact order of degrees
// conferred. Source: NCES Digest of Education Statistics 2023, Table 322.10
// (2021–22 — the most recent published data; the 2022–23 Digest is not yet out):
//   1. Business (375,418)            -> Business
//   2. Health Professions (263,765)  -> Nursing
//   3. Social Sciences & History (151,109) -> Political Science
//   4. Biological Sciences (131,462) -> Biology
//   5. Psychology (129,609)          -> Psychology
//   6. Engineering (123,017)         -> Mechanical Engineering
//   7. Computer & Info Sciences (108,503) -> Computer Science
//   8. Visual & Performing Arts (90,241)  -> Fine Arts
// Broad NCES fields are mapped to recognizable, searchable major names.
const POPULAR_MAJORS = [
  "Business",
  "Nursing",
  "Political Science",
  "Biology",
  "Psychology",
  "Mechanical Engineering",
  "Computer Science",
  "Fine Arts",
];

// ─── Major recommender ────────────────────────────────────────────────
// Every major is tagged with the answer `value`s it aligns with across all
// five quiz dimensions. We score each major against the user's actual
// selections so recommendations reflect everything they picked — not just
// one or two answers.
interface MajorProfile {
  name: string;
  activity: string[];
  environment: string[];
  strength: string[];
  impact: string[];
  subject: string[];
}

const MAJOR_CATALOG: MajorProfile[] = [
  { name: "Mechanical Engineering", activity: ["building"], environment: ["lab", "field"], strength: ["math"], impact: ["science"], subject: ["science", "math"] },
  { name: "Electrical Engineering", activity: ["building"], environment: ["lab", "desk"], strength: ["math"], impact: ["science"], subject: ["math", "science"] },
  { name: "Chemical Engineering", activity: ["building", "analyzing"], environment: ["lab"], strength: ["math"], impact: ["science", "health"], subject: ["science"] },
  { name: "Computer Science", activity: ["building", "analyzing"], environment: ["desk"], strength: ["math"], impact: ["science", "economy"], subject: ["math", "science"] },
  { name: "Software Engineering", activity: ["building"], environment: ["desk"], strength: ["math", "planning"], impact: ["science", "economy"], subject: ["math"] },
  { name: "Information Technology", activity: ["building"], environment: ["desk"], strength: ["planning", "math"], impact: ["economy"], subject: ["math"] },
  { name: "Civil Engineering", activity: ["building"], environment: ["field"], strength: ["math", "planning"], impact: ["science"], subject: ["math", "science"] },
  { name: "Architecture", activity: ["building", "creating"], environment: ["field", "desk"], strength: ["design", "math"], impact: ["art", "science"], subject: ["art", "math"] },
  { name: "Environmental Engineering", activity: ["building", "analyzing"], environment: ["field", "lab"], strength: ["math"], impact: ["science", "health"], subject: ["science"] },
  { name: "Nursing", activity: ["helping"], environment: ["clinic"], strength: ["empathy"], impact: ["health"], subject: ["science"] },
  { name: "Pre-Medicine", activity: ["helping", "analyzing"], environment: ["clinic", "lab"], strength: ["empathy", "math"], impact: ["health", "science"], subject: ["science"] },
  { name: "Physical Therapy", activity: ["helping"], environment: ["clinic"], strength: ["empathy"], impact: ["health"], subject: ["science"] },
  { name: "Social Work", activity: ["helping"], environment: ["field"], strength: ["empathy"], impact: ["policy", "health"], subject: ["history"] },
  { name: "Public Health", activity: ["helping", "analyzing"], environment: ["field", "desk"], strength: ["empathy", "planning"], impact: ["health", "policy"], subject: ["science"] },
  { name: "Education", activity: ["helping"], environment: ["field"], strength: ["empathy", "writing"], impact: ["policy"], subject: ["english", "history"] },
  { name: "Psychology", activity: ["helping", "analyzing"], environment: ["desk", "clinic"], strength: ["empathy"], impact: ["health"], subject: ["science"] },
  { name: "Human Resources", activity: ["helping", "leading"], environment: ["desk"], strength: ["empathy", "planning"], impact: ["economy"], subject: ["history"] },
  { name: "Counseling", activity: ["helping"], environment: ["desk", "clinic"], strength: ["empathy"], impact: ["health"], subject: ["english"] },
  { name: "Data Science", activity: ["analyzing"], environment: ["desk"], strength: ["math"], impact: ["science", "economy"], subject: ["math"] },
  { name: "Finance", activity: ["analyzing", "leading"], environment: ["desk"], strength: ["math", "planning"], impact: ["economy"], subject: ["math"] },
  { name: "Economics", activity: ["analyzing"], environment: ["desk"], strength: ["math"], impact: ["economy", "policy"], subject: ["math", "history"] },
  { name: "Biochemistry", activity: ["analyzing"], environment: ["lab"], strength: ["math"], impact: ["science", "health"], subject: ["science"] },
  { name: "Statistics", activity: ["analyzing"], environment: ["desk"], strength: ["math"], impact: ["science", "economy"], subject: ["math"] },
  { name: "Neuroscience", activity: ["analyzing"], environment: ["lab"], strength: ["math", "empathy"], impact: ["science", "health"], subject: ["science"] },
  { name: "Graphic Design", activity: ["creating"], environment: ["desk", "anywhere"], strength: ["design"], impact: ["art"], subject: ["art"] },
  { name: "Film Studies", activity: ["creating"], environment: ["anywhere"], strength: ["design", "writing"], impact: ["art"], subject: ["art", "english"] },
  { name: "Creative Writing", activity: ["creating"], environment: ["anywhere", "desk"], strength: ["writing"], impact: ["art"], subject: ["english"] },
  { name: "UX Design", activity: ["creating", "analyzing"], environment: ["desk"], strength: ["design"], impact: ["art", "economy"], subject: ["art"] },
  { name: "Digital Media", activity: ["creating"], environment: ["desk", "anywhere"], strength: ["design", "writing"], impact: ["art"], subject: ["art"] },
  { name: "Communications", activity: ["creating", "leading"], environment: ["desk", "anywhere"], strength: ["writing"], impact: ["art", "policy"], subject: ["english"] },
  { name: "Business Administration", activity: ["leading"], environment: ["desk"], strength: ["planning"], impact: ["economy"], subject: ["math", "history"] },
  { name: "Marketing", activity: ["leading", "creating"], environment: ["desk"], strength: ["planning", "design", "writing"], impact: ["economy"], subject: ["english"] },
  { name: "Entrepreneurship", activity: ["leading", "building"], environment: ["anywhere", "desk"], strength: ["planning"], impact: ["economy"], subject: ["math"] },
  { name: "International Business", activity: ["leading"], environment: ["anywhere"], strength: ["planning"], impact: ["economy", "policy"], subject: ["history"] },
  { name: "Political Science", activity: ["leading", "analyzing"], environment: ["anywhere", "desk"], strength: ["writing", "planning"], impact: ["policy"], subject: ["history"] },
  { name: "Law", activity: ["leading", "analyzing"], environment: ["desk"], strength: ["writing"], impact: ["policy"], subject: ["history", "english"] },
];

// ─── Major search autocomplete ────────────────────────────────────────
// Deduped, sorted list of known majors used to power the search suggestions.
const ALL_MAJORS: string[] = Array.from(
  new Set([...POPULAR_MAJORS, ...MAJOR_CATALOG.map((m) => m.name)])
).sort((a, b) => a.localeCompare(b));

// Prefix matches rank above substring matches; the exact-typed name is dropped
// (no point suggesting what the user already typed in full).
function matchMajors(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const name of ALL_MAJORS) {
    const l = name.toLowerCase();
    if (l === q) continue;
    if (l.startsWith(q)) starts.push(name);
    else if (l.includes(q)) contains.push(name);
  }
  return [...starts, ...contains].slice(0, 7);
}

// Renders a suggestion with the matched portion emphasized (Google-style).
function renderMajorMatch(name: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return name;
  const idx = name.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return name;
  return (
    <>
      {name.slice(0, idx)}
      <span className="font-semibold text-foreground">{name.slice(idx, idx + q.length)}</span>
      {name.slice(idx + q.length)}
    </>
  );
}

// Concise phrases describing each selection, used to explain matches.
const SEL_ACTIVITY: Record<string, string> = {
  building: "building and fixing things", helping: "helping people", analyzing: "analyzing data and patterns", creating: "creating and designing", leading: "leading projects",
};
const SEL_ENVIRONMENT: Record<string, string> = {
  lab: "working in a lab", field: "being out in the field", desk: "focused desk work", clinic: "working in a clinic", anywhere: "the freedom to work anywhere",
};
const SEL_STRENGTH: Record<string, string> = {
  math: "your math and logic skills", writing: "your writing ability", empathy: "your empathy", design: "your eye for design", planning: "your organization skills",
};
const SEL_IMPACT: Record<string, string> = {
  science: "advancing science", health: "improving health", policy: "shaping policy", economy: "growing the economy", art: "inspiring through art",
};
const SEL_SUBJECT: Record<string, string> = {
  science: "your love of science", math: "your love of math", english: "your love of English", history: "your love of history", art: "your love of art",
};

// Each dimension contributes to the score; activity weighted highest.
const DIMENSIONS: { key: keyof Omit<MajorProfile, "name">; weight: number; labels: Record<string, string> }[] = [
  { key: "activity", weight: 3, labels: SEL_ACTIVITY },
  { key: "environment", weight: 2, labels: SEL_ENVIRONMENT },
  { key: "strength", weight: 2, labels: SEL_STRENGTH },
  { key: "impact", weight: 2, labels: SEL_IMPACT },
  { key: "subject", weight: 2, labels: SEL_SUBJECT },
];

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function getMajorSuggestions(answers: Record<string, string>): MajorSuggestion[] {
  const scored = MAJOR_CATALOG.map((major) => {
    let score = 0;
    const matched: string[] = [];
    for (const dim of DIMENSIONS) {
      const answer = answers[dim.key];
      if (answer && major[dim.key].includes(answer)) {
        score += dim.weight;
        const phrase = dim.labels[answer];
        if (phrase) matched.push(phrase);
      }
    }
    return { major, score, matched };
  });

  // Highest score first; preserve catalog order for ties (stable sort).
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map(({ major, matched }) => {
    const top = matched.slice(0, 3);
    const reason = top.length > 0
      ? `Matches ${joinList(top)} from your answers.`
      : "A well-rounded option based on your overall answers.";
    return { major: major.name, reason };
  });
}

interface MajorSuggestion { major: string; reason: string; }

function InterestQuiz({ onComplete }: { onComplete: (majors: MajorSuggestion[]) => void }) {
  const [questions] = useState<QuizQuestion[]>(
    () => QUIZ_VERSIONS[Math.floor(Math.random() * QUIZ_VERSIONS.length)]
  );
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string>("");

  const question = questions[step];
  const isLast = step === questions.length - 1;
  const progress = ((step) / questions.length) * 100;

  const handleNext = () => {
    if (!selected) return;
    const newAnswers = { ...answers, [question.id]: selected };
    setAnswers(newAnswers);
    setSelected("");
    if (isLast) {
      onComplete(getMajorSuggestions(newAnswers));
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (step === 0) return;
    setStep((s) => s - 1);
    setSelected(answers[questions[step - 1].id] || "");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            Quick Quiz · {questions.length} questions
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3">Find your perfect major</h1>
          <p className="text-muted-foreground">Answer a few quick questions and we'll suggest majors that match your interests.</p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-border rounded-full h-1.5 mb-8 overflow-hidden">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question card */}
        <div className="bg-card rounded-3xl border border-border shadow-sm p-8 animate-in fade-in slide-in-from-bottom-4 duration-400">
          <h2 className="text-xl font-bold text-foreground text-center mb-6">{question.question}</h2>
          <div className="space-y-3">
            {question.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={`w-full text-left px-5 py-3.5 rounded-xl border text-sm font-medium transition-all ${
                  selected === opt.value
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-card border-border text-foreground hover:border-muted-foreground hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-sm text-muted-foreground font-medium">{step + 1} / {questions.length}</span>
          <button
            onClick={handleNext}
            disabled={!selected}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLast ? "See Results" : "Next"} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quiz Results splash ──────────────────────────────────────────────
function QuizResults({ majors, onExplore, onDismiss }: { majors: MajorSuggestion[]; onExplore: (major: string) => void; onDismiss: () => void }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Your top matches!</h1>
        <p className="text-muted-foreground mb-8">Based on your interests, here are the majors we think you'll love — and why. Click one to explore it.</p>
        <div className="space-y-3 mb-8">
          {majors.map((item, i) => (
            <button
              key={item.major}
              onClick={() => onExplore(item.major)}
              className="w-full flex items-start gap-4 bg-card border border-border rounded-2xl p-5 text-left hover:border-muted-foreground hover:shadow-md transition-all group"
            >
              <span className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-serif font-bold text-lg flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-serif font-bold text-foreground text-lg">{item.major}</span>
                {item.reason && <span className="block text-sm text-muted-foreground mt-1 leading-relaxed">{item.reason}</span>}
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-2.5" />
            </button>
          ))}
        </div>
        <button onClick={onDismiss} className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
          Skip and explore on my own
        </button>
      </div>
    </div>
  );
}

// ─── Curriculum Modal ────────────────────────────────────────────────
function CurriculumModal({ college, major, profile, onClose }: { college: College; major: string; profile: UserProfile; onClose: () => void }) {
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
      <div className="relative z-10 w-full md:max-w-2xl max-h-[90vh] bg-card md:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-400" onClick={(e) => e.stopPropagation()}>
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

// ─── Saved View ───────────────────────────────────────────────────────
type SortMode = "rank" | "alpha";

function SavedView({ saved, onUnsaveMajor, onUnsaveCollege, userGpa }: {
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
            <div key={item.majorName} className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
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
          );
        })}
      </div>
    </div>
  );
}

// ─── My Colleges View ────────────────────────────────────────────────
function MyCollegesView({ myColleges, onRemove, userGpa }: {
  myColleges: MyCollege[];
  onRemove: (collegeName: string, majorName: string) => void;
  userGpa: number | null;
}) {
  const [sortMode, setSortMode] = useState<Record<string, SortMode>>({});

  const grouped = myColleges.reduce<Record<string, MyCollege[]>>((acc, c) => {
    (acc[c.majorName] ??= []).push(c);
    return acc;
  }, {});

  const groups = Object.entries(grouped).sort(([, a], [, b]) => b[0].savedAt - a[0].savedAt);
  const totalColleges = myColleges.length;

  const getSortMode = (name: string): SortMode => sortMode[name] || "rank";
  const toggleSort = (name: string) => setSortMode(prev => ({ ...prev, [name]: prev[name] === "alpha" ? "rank" : "alpha" }));

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

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-foreground">My Colleges</h2>
        <p className="text-muted-foreground mt-1">{totalColleges} saved {totalColleges === 1 ? "college" : "colleges"}</p>
      </div>
      <div className="space-y-6">
        {groups.map(([majorName, colleges]) => {
          const mode = getSortMode(majorName);
          const sorted = mode === "alpha" ? [...colleges].sort((a, b) => a.name.localeCompare(b.name)) : [...colleges].sort((a, b) => a.rank - b.rank);
          return (
            <div key={majorName} className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
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
                {sorted.map((college) => (
                  <li key={`${college.name}-${majorName}`} className="group flex items-center gap-3 px-5 md:px-6 py-3.5 hover:bg-muted transition-colors">
                    <span className="w-7 h-7 rounded-lg bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">#{college.rank}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground text-sm truncate">{college.name}</p>
                        <CollegeFitBadge userGpa={userGpa} admissionsProfile={college.admissionsProfile} className="flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <p className="text-muted-foreground text-xs">{college.location}</p>
                      </div>
                    </div>
                    <button onClick={() => onRemove(college.name, majorName)} className="w-8 h-8 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0" title="Remove">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── College fit (Reach / Match / Safety) ─────────────────────────────
type FitTier = "safety" | "match" | "reach";

// Fallback GPA bands by selectivity tier, used only when a college has no
// explicit admitted-GPA range. Unweighted 4.0 scale.
const TIER_GPA_BANDS: Record<string, { low: number; high: number }> = {
  most_selective: { low: 3.9, high: 4.0 },
  highly_selective: { low: 3.7, high: 3.95 },
  selective: { low: 3.3, high: 3.8 },
  accessible: { low: 2.5, high: 3.3 },
};

function computeFit(userGpa: number | null, ap: College["admissionsProfile"]): FitTier | null {
  if (userGpa == null || !ap) return null;
  const band = TIER_GPA_BANDS[ap.selectivityTier];
  const low = ap.gpaLow ?? band?.low;
  const high = ap.gpaHigh ?? band?.high;
  if (low == null || high == null) return null;
  if (userGpa >= high) return "safety";
  if (userGpa >= low) return "match";
  return "reach";
}

const FIT_BADGE: Record<FitTier, { label: string; cls: string }> = {
  safety: { label: "Safety", cls: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800" },
  match: { label: "Match", cls: "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-800" },
  reach: { label: "Reach", cls: "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:ring-rose-800" },
};

function CollegeFitBadge({ userGpa, admissionsProfile, className = "" }: {
  userGpa: number | null;
  admissionsProfile: College["admissionsProfile"];
  className?: string;
}) {
  const fit = computeFit(userGpa, admissionsProfile);
  if (!fit) return null;
  const { label, cls } = FIT_BADGE[fit];
  return (
    <span
      title="Estimated fit based on your GPA vs the college's typical admitted GPA range. A rough guide, not a prediction."
      className={`inline-flex items-center text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${cls} ${className}`}
      data-testid={`badge-fit-${fit}`}
    >
      {label}
    </span>
  );
}

// ─── Filter chips (fit / selectivity) ─────────────────────────────────
function FilterChips({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mr-1 min-w-[68px]">{label}</span>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${value === o.value ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"}`}
          data-testid={`filter-${label.toLowerCase()}-${o.value}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

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

function AdmissionComparison({ profile, admissionsProfile }: {
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

// ─── Currency + Career stats (real BLS data) ──────────────────────────
function formatUSD(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function CareerStats({ career }: { career: CareerInfo | null }) {
  if (!career) {
    return (
      <div className="relative z-10 border-t border-border pt-6">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Career Outlook</span>
        </div>
        <p className="text-sm text-muted-foreground" data-testid="text-career-unavailable">
          We don't have official labor-statistics data matched to this major yet. Try a closely related field to see salary and job-growth figures.
        </p>
      </div>
    );
  }

  const growthPositive = career.projectedGrowthPct >= 0;

  return (
    <div className="relative z-10 border-t border-border pt-6" data-testid="section-career-stats">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Career Outlook</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground">Typical career: {career.occupation}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-background rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1 font-medium">Entry (10th pct)</p>
          <p className="text-lg font-bold text-foreground" data-testid="text-wage-entry">{formatUSD(career.annualEntryWage)}</p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-950/40 rounded-xl p-4 text-center ring-1 ring-indigo-100 dark:ring-indigo-900/50">
          <p className="text-xs text-indigo-400 dark:text-indigo-300 mb-1 font-medium">Median</p>
          <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300" data-testid="text-wage-median">{formatUSD(career.annualMedianWage)}</p>
        </div>
        <div className="bg-background rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1 font-medium">Experienced (90th pct)</p>
          <p className="text-lg font-bold text-foreground" data-testid="text-wage-experienced">{formatUSD(career.annualExperiencedWage)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-3 bg-background rounded-xl p-4">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${growthPositive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"}`}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Projected job growth</p>
            <p className="text-base font-bold text-foreground" data-testid="text-growth">
              {growthPositive ? "+" : ""}{career.projectedGrowthPct}%{" "}
              <span className="text-xs font-normal text-muted-foreground">· {career.growthDataPeriod}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-background rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-border text-foreground flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Typical entry-level education</p>
            <p className="text-base font-bold text-foreground" data-testid="text-education">{career.typicalEducation}</p>
          </div>
        </div>
      </div>

      <a
        href={career.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-muted-foreground transition-colors"
      >
        <ExternalLink className="w-3 h-3" />
        Source: {career.sourceName} · Wages {career.wageDataYear}
      </a>
    </div>
  );
}

// ─── Explore View ──────────────────────────────────────────────────────
function ExploreView({ saved, setSaved, myColleges, setMyColleges, initialMajor, userGpa, profile }: {
  saved: SavedData;
  setSaved: (d: SavedData) => void;
  myColleges: MyCollege[];
  setMyColleges: (d: MyCollege[]) => void;
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    const { major, description } = lookupMajor.data;
    const updated = { ...saved };
    if (!updated[major]) updated[major] = { majorName: major, description, savedAt: Date.now(), colleges: [] };
    else updated[major].description = description;
    setSaved(updated); persistSaved(updated);
  }, [saved, lookupMajor.data, setSaved]);

  const unsaveMajor = useCallback(() => {
    if (!lookupMajor.data) return;
    const updated = { ...saved };
    delete updated[lookupMajor.data.major];
    setSaved(updated); persistSaved(updated);
  }, [saved, lookupMajor.data, setSaved]);

  const isInSaved = (majorName: string, collegeName: string) =>
    !!saved[majorName]?.colleges.find((c) => c.name === collegeName);
  const isInMyColleges = (collegeName: string, majorName: string) =>
    myColleges.some((c) => c.name === collegeName && c.majorName === majorName);
  const isAnywhereSaved = (majorName: string, collegeName: string) =>
    isInSaved(majorName, collegeName) || isInMyColleges(collegeName, majorName);

  const toggleSavedCollege = useCallback((college: College, majorName: string, description: string) => {
    const updated = { ...saved };
    if (!updated[majorName]) updated[majorName] = { majorName, description, savedAt: Date.now(), colleges: [] };
    const already = updated[majorName].colleges.find((c) => c.name === college.name);
    if (already) {
      updated[majorName].colleges = updated[majorName].colleges.filter((c) => c.name !== college.name);
    } else {
      updated[majorName].colleges = [...updated[majorName].colleges, { ...college, savedAt: Date.now() }];
    }
    setSaved(updated); persistSaved(updated);
  }, [saved, setSaved]);

  const toggleMyCollege = useCallback((college: College, majorName: string) => {
    const already = myColleges.some((c) => c.name === college.name && c.majorName === majorName);
    const updated = already
      ? myColleges.filter((c) => !(c.name === college.name && c.majorName === majorName))
      : [...myColleges, { ...college, majorName, savedAt: Date.now() }];
    setMyColleges(updated); persistMyColleges(updated);
  }, [myColleges, setMyColleges]);

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
            className="block w-full pl-12 pr-32 py-4 md:py-5 border border-border rounded-full text-lg shadow-sm focus:ring-2 focus:ring-ring focus:border-ring transition-all bg-card text-foreground placeholder:text-muted-foreground"
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
            <div id="major-suggestions-list" role="listbox" className="absolute z-40 top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-1 duration-150" data-testid="major-suggestions">
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
                <button key={major} onClick={() => setSuggestedMajor(major)} className="px-5 py-2.5 bg-card border border-border rounded-full text-foreground hover:border-muted-foreground hover:shadow-sm transition-all">{major}</button>
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
            <div className="bg-card rounded-2xl shadow-sm border border-border p-8 md:p-12 mb-8 animate-pulse">
              <div className="h-10 bg-muted rounded w-1/3 mb-6" />
              <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-muted rounded" style={{ width: `${85+(i*3)}%` }} />)}</div>
            </div>
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-48 mb-2 animate-pulse" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-card rounded-xl shadow-sm border border-border p-6 flex gap-6 animate-pulse">
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
            <div className="bg-card rounded-3xl shadow-sm border border-border p-8 md:p-12 mb-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-background rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none" />
              <div className="flex items-start justify-between gap-4 mb-5 relative z-10">
                <h2 className="text-3xl md:text-4xl font-serif text-foreground font-bold leading-tight">{result.major}</h2>
                <button
                  onClick={isMajorSaved(result.major) ? unsaveMajor : saveMajor}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${isMajorSaved(result.major) ? "bg-primary border-primary text-primary-foreground hover:bg-primary/90" : "bg-card border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"}`}
                  data-testid="button-save-major"
                >
                  {isMajorSaved(result.major) ? <><BookmarkCheck className="w-4 h-4" /> Saved</> : <><Bookmark className="w-4 h-4" /> Save Major</>}
                </button>
              </div>
              <p className="text-lg leading-relaxed text-foreground relative z-10 mb-8" data-testid="text-major-description">{result.description}</p>
              <CareerStats career={result.career} />
            </div>

            <div className="mb-4 flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-foreground" />
              <h3 className="text-2xl font-serif text-foreground font-bold">Top Colleges</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Click a college to see its 4-year course plan. Use the bookmark to save it to a list.</p>

            <div className="mb-5 bg-card border border-border rounded-2xl p-4 space-y-3">
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
                <div className="bg-card border border-border rounded-2xl p-8 text-center" data-testid="empty-filtered">
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
                  <div
                    key={college.rank}
                    className={`bg-card rounded-2xl border border-border transition-all duration-200 hover:shadow-md hover:border-muted-foreground group animate-in fade-in slide-in-from-bottom-4 stagger-${index+1} fill-mode-both`}
                    data-testid={`item-college-${college.rank}`}
                  >
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
                          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${anySaved ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"}`}
                          title="Save to a list"
                          data-testid={`button-save-college-${college.rank}`}
                        >
                          {anySaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                        </button>
                        {isOpen && (
                          <div className="absolute right-0 top-11 z-30 bg-card border border-border rounded-2xl shadow-xl w-48 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
                              onClick={(e) => { e.stopPropagation(); toggleMyCollege(college, result.major); }}
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
                  </div>
                );
              })}
            </div>

            {pageCount > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3" data-testid="pagination-controls">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-border bg-card text-sm font-medium text-foreground transition-all hover:border-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-sm text-muted-foreground tabular-nums px-2" data-testid="text-page-indicator">Page {currentPage + 1} of {pageCount}</span>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === pageCount - 1}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-border bg-card text-sm font-medium text-foreground transition-all hover:border-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed"
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

// ─── Chat Widget ──────────────────────────────────────────────────────
function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I'm Sage, your college advisor. Ask me anything about majors, careers, or universities." }
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendChat = useChat();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendChat.isPending]);

  const send = () => {
    const text = input.trim();
    if (!text || sendChat.isPending) return;
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    sendChat.mutate({ data: { messages: newMessages } }, {
      onSuccess: (data) => setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]),
      onError: () => setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]),
    });
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-24 left-4 md:left-6 z-50 w-[calc(100vw-2rem)] max-w-sm flex flex-col bg-card rounded-3xl shadow-2xl border border-border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-primary">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-primary-foreground text-sm">Sage</p>
              <p className="text-primary-foreground/60 text-xs">AI College Advisor</p>
            </div>
            <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors">
              <X className="w-3.5 h-3.5 text-primary-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                    <Bot className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {sendChat.isPending && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                  <Bot className="w-3 h-3 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="px-4 py-3 border-t border-border flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Ask Sage anything..."
              className="flex-1 text-sm bg-background border border-border rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all placeholder:text-muted-foreground"
              disabled={sendChat.isPending}
            />
            <button onClick={send} disabled={!input.trim() || sendChat.isPending} className="w-9 h-9 rounded-full bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0">
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen((v) => !v)} className="fixed bottom-6 left-4 md:left-6 z-50 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all flex items-center justify-center" aria-label="Chat with Sage">
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </>
  );
}

// ─── User Menu ────────────────────────────────────────────────────────
function UserMenu() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Account";
  const initials = (user?.firstName?.[0] || "") + (user?.lastName?.[0] || "");

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 p-1.5 sm:pl-3 sm:pr-4 sm:py-2 rounded-full border border-border bg-card hover:bg-muted hover:border-muted-foreground transition-all"
      >
        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
          {initials || <User className="w-3.5 h-3.5" />}
        </div>
        <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[100px] truncate">{displayName}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 bg-card border border-border rounded-2xl shadow-xl w-52 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs text-muted-foreground font-medium">Signed in as</p>
            <p className="text-sm font-semibold text-foreground truncate mt-0.5">{user?.emailAddresses?.[0]?.emailAddress}</p>
          </div>
          <button
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Suggested Majors View ────────────────────────────────────────────
function SuggestedView({ results, onExplore, onRetake }: {
  results: MajorSuggestion[];
  onExplore: (major: string) => void;
  onRetake: () => void;
}) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <h3 className="text-xl font-bold text-foreground mb-2">No suggestions yet</h3>
        <p className="text-muted-foreground max-w-sm mb-8">Take the quiz to get personalized major recommendations based on your interests.</p>
        <button onClick={onRetake} className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-6 py-3 rounded-full hover:bg-primary/90 transition-colors">
          <Sparkles className="w-4 h-4" /> Take the Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Suggested Majors</h2>
          <p className="text-muted-foreground mt-1">Based on your quiz answers — click any to explore it.</p>
        </div>
        <button
          onClick={onRetake}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium text-muted-foreground hover:border-muted-foreground hover:text-foreground hover:bg-card transition-all bg-card"
        >
          <Sparkles className="w-3.5 h-3.5" /> Retake Quiz
        </button>
      </div>
      <div className="space-y-3">
        {results.map((item, i) => (
          <button
            key={item.major}
            onClick={() => onExplore(item.major)}
            className="w-full flex items-start gap-4 bg-card border border-border rounded-2xl p-5 text-left hover:border-muted-foreground hover:shadow-md transition-all group"
          >
            <span className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center flex-shrink-0 font-sans">
              {i + 1}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-foreground text-lg">{item.major}</span>
              {item.reason && <span className="block text-sm text-muted-foreground mt-1 leading-relaxed">{item.reason}</span>}
            </span>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-2.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────
type AppView = "explore" | "suggested" | "careers" | "colleges" | "saved";

// ─── Onboarding & profile (GPA + goals) ───────────────────────────────
const GOAL_PRESETS = [
  "Maximize earning potential",
  "Job stability & growth",
  "Help people / social impact",
  "Get into grad or professional school",
  "Build or create things",
  "Start my own venture",
];

function useGpaGoals(initial: UserProfile) {
  const [gpa, setGpa] = useState(initial.gpa == null ? "" : String(initial.gpa));
  const [sat, setSat] = useState(initial.sat == null ? "" : String(initial.sat));
  const [act, setAct] = useState(initial.act == null ? "" : String(initial.act));
  const [goals, setGoals] = useState(initial.goals);

  const gpaTrim = gpa.trim();
  const gpaNum = gpaTrim === "" ? null : Number(gpaTrim);
  const gpaValid = gpaNum == null || (Number.isFinite(gpaNum) && gpaNum >= 0 && gpaNum <= 4);

  const satTrim = sat.trim();
  const satNum = satTrim === "" ? null : Number(satTrim);
  const satValid = satNum == null || (Number.isFinite(satNum) && satNum >= 400 && satNum <= 1600);

  const actTrim = act.trim();
  const actNum = actTrim === "" ? null : Number(actTrim);
  const actValid = actNum == null || (Number.isFinite(actNum) && actNum >= 1 && actNum <= 36);

  const profile: UserProfile = {
    gpa: gpaValid ? gpaNum : null,
    sat: satValid ? satNum : null,
    act: actValid ? actNum : null,
    goals: goals.trim(),
  };
  return { gpa, setGpa, sat, setSat, act, setAct, goals, setGoals, gpaValid, satValid, actValid, profile };
}

function GpaGoalsControls({ state }: { state: ReturnType<typeof useGpaGoals> }) {
  const { gpa, setGpa, sat, setSat, act, setAct, goals, setGoals, gpaValid, satValid, actValid } = state;
  return (
    <div className="space-y-5 text-left">
      <div>
        <label htmlFor="gpa-input" className="block text-sm font-semibold text-foreground mb-1.5">
          Your GPA <span className="font-normal text-muted-foreground">(unweighted, 4.0 scale)</span>
        </label>
        <input
          id="gpa-input"
          type="number"
          inputMode="decimal"
          min="0"
          max="4"
          step="0.01"
          value={gpa}
          onChange={(e) => setGpa(e.target.value)}
          placeholder="e.g. 3.7"
          className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-colors ${gpaValid ? "border-border focus:border-primary" : "border-rose-300 focus:border-rose-500"}`}
          data-testid="input-gpa"
        />
        {!gpaValid && <p className="text-xs text-rose-500 mt-1.5">Enter a GPA between 0 and 4.0.</p>}
        <p className="text-xs text-muted-foreground mt-1.5">Stored only on your device to estimate Reach / Match / Safety. Never sent to our servers.</p>
      </div>
      <div>
        <span className="block text-sm font-semibold text-foreground mb-1.5">
          Test scores <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="sat-input" className="block text-xs font-medium text-muted-foreground mb-1">SAT total (400–1600)</label>
            <input
              id="sat-input"
              type="number"
              inputMode="numeric"
              min="400"
              max="1600"
              step="10"
              value={sat}
              onChange={(e) => setSat(e.target.value)}
              placeholder="e.g. 1350"
              className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-colors ${satValid ? "border-border focus:border-primary" : "border-rose-300 focus:border-rose-500"}`}
              data-testid="input-sat"
            />
            {!satValid && <p className="text-xs text-rose-500 mt-1.5">400–1600.</p>}
          </div>
          <div>
            <label htmlFor="act-input" className="block text-xs font-medium text-muted-foreground mb-1">ACT composite (1–36)</label>
            <input
              id="act-input"
              type="number"
              inputMode="numeric"
              min="1"
              max="36"
              step="1"
              value={act}
              onChange={(e) => setAct(e.target.value)}
              placeholder="e.g. 30"
              className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-colors ${actValid ? "border-border focus:border-primary" : "border-rose-300 focus:border-rose-500"}`}
              data-testid="input-act"
            />
            {!actValid && <p className="text-xs text-rose-500 mt-1.5">1–36.</p>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">Add either or both to see how you compare with each college's typical admitted students. Stored only on your device, never sent to our servers.</p>
      </div>
      <div>
        <span className="block text-sm font-semibold text-foreground mb-2">
          What matters most to you? <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <div className="flex flex-wrap gap-2 mb-2.5">
          {GOAL_PRESETS.map((g) => {
            const active = goals === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGoals(active ? "" : g)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${active ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground hover:border-muted-foreground"}`}
              >
                {g}
              </button>
            );
          })}
        </div>
        <textarea
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          rows={2}
          placeholder="Or describe your goals in your own words…"
          className="w-full px-4 py-3 rounded-xl border border-border text-sm outline-none focus:border-primary transition-colors resize-none"
          data-testid="input-goals"
        />
      </div>
    </div>
  );
}

function OnboardingProfile({ initial, onComplete, onSkip }: {
  initial: UserProfile;
  onComplete: (p: UserProfile) => void;
  onSkip: () => void;
}) {
  const state = useGpaGoals(initial);
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
            <Sparkles className="w-3.5 h-3.5" /> One last thing
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3">Personalize your college fit</h1>
          <p className="text-muted-foreground">Add your GPA and we'll flag every college as a Reach, Match, or Safety. You can change this anytime.</p>
        </div>
        <div className="bg-card rounded-3xl border border-border shadow-sm p-8">
          <GpaGoalsControls state={state} />
          <button
            onClick={() => onComplete(state.profile)}
            disabled={!(state.gpaValid && state.satValid && state.actValid)}
            className="w-full mt-6 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-6 py-3 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="button-save-profile"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center mt-6">
          <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2" data-testid="button-skip-profile">
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

type SettingsSection = "account" | "appearance" | "profile" | "data";
const SETTINGS_SECTIONS: { id: SettingsSection; label: string; icon: LucideIcon }[] = [
  { id: "account", label: "Account", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "profile", label: "Profile", icon: SlidersHorizontal },
  { id: "data", label: "Data & privacy", icon: ShieldCheck },
];
const THEME_OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function SettingsDialog({ initial, onSaveProfile, theme, onChangeTheme, onRetakeQuiz, onClose }: {
  initial: UserProfile;
  onSaveProfile: (p: UserProfile) => void;
  theme: Theme;
  onChangeTheme: (t: Theme) => void;
  onRetakeQuiz: () => void;
  onClose: () => void;
}) {
  const [section, setSection] = useState<SettingsSection>("account");
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const gpaState = useGpaGoals(initial);
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "Your account";
  const email = user?.emailAddresses?.[0]?.emailAddress ?? "";
  const initials = (user?.firstName?.[0] || "") + (user?.lastName?.[0] || "");

  const handleSaveProfile = () => {
    onSaveProfile(gpaState.profile);
    setSavedFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1800);
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl w-full h-[600px] max-h-[88vh] p-0 gap-0 flex flex-col overflow-hidden rounded-3xl sm:rounded-3xl bg-card">
        <DialogDescription className="sr-only">Manage your account, appearance, profile, and data settings.</DialogDescription>
        <div className="flex items-center px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-bold text-foreground">Settings</DialogTitle>
        </div>

        <div className="flex flex-1 min-h-0 flex-col sm:flex-row">
          <aside className="shrink-0 border-b sm:border-b-0 sm:border-r border-border p-3 sm:w-52">
            <nav className="flex sm:flex-col gap-1 overflow-x-auto no-scrollbar">
              {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => {
                const active = section === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSection(id)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 whitespace-nowrap ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            {section === "account" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">Account</h3>
                  <p className="text-sm text-muted-foreground">Manage your account and sign-in details.</p>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-background">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-base font-bold shrink-0">
                    {initials || <User className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                    {email && <p className="text-sm text-muted-foreground truncate">{email}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <button onClick={() => openUserProfile()} className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                    <span className="flex items-center gap-3"><UserCog className="w-4 h-4 text-muted-foreground" /> Manage account</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => signOut({ redirectUrl: basePath || "/" })} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              </div>
            )}

            {section === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">Appearance</h3>
                  <p className="text-sm text-muted-foreground">Customize how Next Steps looks on this device.</p>
                </div>
                <div>
                  <span className="block text-sm font-semibold text-foreground mb-3">Theme</span>
                  <div className="grid grid-cols-3 gap-3">
                    {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
                      const active = theme === value;
                      return (
                        <button
                          key={value}
                          onClick={() => onChangeTheme(value)}
                          className={`flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border-2 text-sm font-medium transition-colors ${active ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"}`}
                        >
                          <Icon className="w-5 h-5" />
                          {label}
                          {active && <span className="text-[11px] font-semibold text-primary flex items-center gap-1"><Check className="w-3 h-3" /> Selected</span>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">“System” follows your device's light or dark setting automatically.</p>
                </div>
              </div>
            )}

            {section === "profile" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">Profile</h3>
                  <p className="text-sm text-muted-foreground">Used to estimate your Reach / Match / Safety colleges.</p>
                </div>
                <GpaGoalsControls state={gpaState} />
                <div className="pt-1">
                  <button
                    onClick={handleSaveProfile}
                    disabled={!(gpaState.gpaValid && gpaState.satValid && gpaState.actValid)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    data-testid="button-save-profile-settings"
                  >
                    {savedFlash ? <><Check className="w-4 h-4" /> Saved</> : "Save changes"}
                  </button>
                </div>
              </div>
            )}

            {section === "data" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">Data &amp; privacy</h3>
                  <p className="text-sm text-muted-foreground">Your data stays on this device.</p>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-background">
                  <ShieldCheck className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">Your GPA, goals, saved majors and colleges are stored only in this browser. They're never sent to our servers or used to identify you.</p>
                </div>
                <div className="space-y-2">
                  <button onClick={() => { onRetakeQuiz(); onClose(); }} className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                    <span className="flex items-center gap-3"><RotateCcw className="w-4 h-4 text-muted-foreground" /> Retake the interest quiz</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Browse Careers ───────────────────────────────────────────────────
const DEGREE_ORDER = [
  "No formal educational credential",
  "High school diploma or equivalent",
  "Postsecondary nondegree award",
  "Some college, no degree",
  "Associate's degree",
  "Bachelor's degree",
  "Master's degree",
  "Doctoral or professional degree",
];
const WAGE_OPTIONS = [
  { label: "Any salary", value: 0 },
  { label: "$40k+", value: 40000 },
  { label: "$60k+", value: 60000 },
  { label: "$80k+", value: 80000 },
  { label: "$100k+", value: 100000 },
  { label: "$120k+", value: 120000 },
];
const GROWTH_OPTIONS = [
  { label: "Any growth", value: -100 },
  { label: "0%+ (stable)", value: 0 },
  { label: "5%+", value: 5 },
  { label: "10%+ (fast)", value: 10 },
  { label: "20%+ (much faster)", value: 20 },
];

function CareersView() {
  const { data: careers, isLoading, isError, refetch, isFetching } = useGetCareers();
  const [search, setSearch] = useState("");
  const [minWage, setMinWage] = useState(0);
  const [minGrowth, setMinGrowth] = useState(-100);
  const [degree, setDegree] = useState("any");

  const degreeOptions = useMemo(() => {
    const present = new Set((careers ?? []).map((c) => c.typicalEducation));
    return DEGREE_ORDER.filter((d) => present.has(d));
  }, [careers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (careers ?? [])
      .filter((c) => (q ? c.occupation.toLowerCase().includes(q) : true))
      .filter((c) => (minWage > 0 ? c.annualMedianWage >= minWage : true))
      .filter((c) => (minGrowth > -100 ? c.projectedGrowthPct >= minGrowth : true))
      .filter((c) => (degree !== "any" ? c.typicalEducation === degree : true))
      .sort((a, b) => b.annualMedianWage - a.annualMedianWage);
  }, [careers, search, minWage, minGrowth, degree]);

  const filtersActive = search.trim() !== "" || minWage > 0 || minGrowth > -100 || degree !== "any";
  const resetFilters = () => { setSearch(""); setMinWage(0); setMinGrowth(-100); setDegree("any"); };

  const selectCls = "px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium text-foreground outline-none focus:border-primary transition-colors cursor-pointer";

  return (
    <main className="w-full max-w-5xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h2 className="text-3xl font-serif font-bold text-foreground">Browse Careers</h2>
        <p className="text-muted-foreground mt-1">Explore occupations with real salary and job-growth data from the U.S. Bureau of Labor Statistics.</p>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search occupations…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border text-sm outline-none focus:border-primary transition-colors"
              data-testid="input-career-search"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <select value={minWage} onChange={(e) => setMinWage(Number(e.target.value))} className={selectCls} data-testid="select-wage">
              {WAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={minGrowth} onChange={(e) => setMinGrowth(Number(e.target.value))} className={selectCls} data-testid="select-growth">
              {GROWTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={degree} onChange={(e) => setDegree(e.target.value)} className={selectCls} data-testid="select-degree">
              <option value="any">Any education</option>
              {degreeOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {filtersActive && (
              <button onClick={resetFilters} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground px-2 py-2 transition-colors" data-testid="button-reset-filters">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-3" />
              <div className="h-7 bg-muted rounded w-1/2 mb-3" />
              <div className="h-5 bg-muted rounded w-full mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-rose-500" />
          </div>
          <h3 className="text-lg font-serif font-bold text-foreground mb-1.5">Couldn't load careers</h3>
          <p className="text-muted-foreground max-w-sm mb-5">Something went wrong fetching the career data. Please try again.</p>
          <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors">
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Briefcase className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-serif font-bold text-foreground mb-1.5">No careers match your filters</h3>
          <p className="text-muted-foreground max-w-sm mb-5">Try widening your salary, growth, or education filters.</p>
          {filtersActive && (
            <button onClick={resetFilters} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors">
              <RotateCcw className="w-4 h-4" /> Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">{filtered.length} {filtered.length === 1 ? "occupation" : "occupations"}{isFetching ? " · refreshing…" : ""}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => {
              const up = c.projectedGrowthPct >= 0;
              return (
                <div key={c.socCode} className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col" data-testid={`card-career-${c.socCode}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-serif font-bold text-foreground text-base leading-tight">{c.occupation}</h3>
                    <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0 mt-1">{c.socCode}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-3">
                    <span className="text-2xl font-bold text-foreground">{formatUSD(c.annualMedianWage)}</span>
                    <span className="text-xs text-muted-foreground">median / yr</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${up ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"}`}>
                      <TrendingUp className="w-3 h-3" />{up ? "+" : ""}{c.projectedGrowthPct}%
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg bg-muted text-muted-foreground">
                      <Award className="w-3 h-3" />{c.typicalEducation}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-auto pt-1">
                    Entry {formatUSD(c.annualEntryWage)} · Experienced {formatUSD(c.annualExperiencedWage)}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Source: U.S. Bureau of Labor Statistics — OEWS wages &amp; Employment Projections. Figures are national medians.
          </p>
        </>
      )}
    </main>
  );
}

function AppShell() {
  const [view, setView] = useState<AppView>("explore");
  const [saved, setSaved] = useState<SavedData>(loadSaved);
  const [myColleges, setMyColleges] = useState<MyCollege[]>(loadMyColleges);
  const [profile, setProfile] = useState<UserProfile>(loadProfile);
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

  const savedMajorCount = Object.keys(saved).length;
  const savedCollegeCount = myColleges.length;

  const unsaveMajor = (majorName: string) => {
    const updated = { ...saved };
    delete updated[majorName];
    setSaved(updated); persistSaved(updated);
  };

  const unsaveCollege = (majorName: string, collegeName: string) => {
    const updated = { ...saved };
    if (updated[majorName]) {
      updated[majorName].colleges = updated[majorName].colleges.filter((c) => c.name !== collegeName);
    }
    setSaved(updated); persistSaved(updated);
  };

  const removeMyCollege = (collegeName: string, majorName: string) => {
    const updated = myColleges.filter((c) => !(c.name === collegeName && c.majorName === majorName));
    setMyColleges(updated); persistMyColleges(updated);
  };

  const handleQuizComplete = (majors: MajorSuggestion[]) => {
    setQuizResults(majors);
    localStorage.setItem(QUIZ_RESULTS_KEY, JSON.stringify(majors));
    setQuizState("profile");
  };

  const handleProfileComplete = (p: UserProfile) => {
    setProfile(p); persistProfile(p);
    setQuizState("results");
  };
  const handleProfileSkip = () => setQuizState("results");
  const handleSaveProfile = (p: UserProfile) => { setProfile(p); persistProfile(p); };

  const handleExploreMajor = (major: string) => {
    localStorage.setItem(QUIZ_DONE_KEY, "1");
    setQuizState("done");
    setExploreInitialMajor(major);
    setView("explore");
  };

  const handleDismissQuiz = () => {
    localStorage.setItem(QUIZ_DONE_KEY, "1");
    setQuizState("done");
  };

  const handleRetakeQuiz = () => {
    localStorage.removeItem(QUIZ_DONE_KEY);
    setQuizState("quiz");
  };

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

  const navBtn = (target: AppView, label: string, count?: number) => (
    <button
      onClick={() => setView(target)}
      className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${view === target ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${view === target ? "bg-card text-foreground" : "bg-primary text-primary-foreground"}`}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <header className="w-full px-4 sm:px-6 lg:px-12 py-3 lg:py-4 border-b border-border bg-card shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => setView("explore")} className="flex items-center gap-2 text-foreground hover:opacity-75 transition-opacity shrink-0">
            <Milestone className="w-5 h-5 text-foreground" />
            <span className="font-serif font-semibold text-lg tracking-tight">Next Steps</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="hidden lg:flex items-center gap-1">
              {navBtn("explore", "Explore")}
              {navBtn("suggested", "Suggested")}
              {navBtn("careers", "Careers")}
              {navBtn("colleges", "My Colleges", savedCollegeCount)}
              {navBtn("saved", "Saved", savedMajorCount)}
            </nav>
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
        <nav className="lg:hidden flex items-center gap-1 mt-2 -mx-4 px-4 overflow-x-auto no-scrollbar">
          {navBtn("explore", "Explore")}
          {navBtn("suggested", "Suggested")}
          {navBtn("careers", "Careers")}
          {navBtn("colleges", "My Colleges", savedCollegeCount)}
          {navBtn("saved", "Saved", savedMajorCount)}
        </nav>
      </header>

      {view === "explore" && (
        <ExploreView
          saved={saved} setSaved={setSaved}
          myColleges={myColleges} setMyColleges={setMyColleges}
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
      {view === "colleges" && (
        <MyCollegesView myColleges={myColleges} onRemove={removeMyCollege} userGpa={profile.gpa} />
      )}
      {view === "saved" && (
        <SavedView saved={saved} onUnsaveMajor={unsaveMajor} onUnsaveCollege={unsaveCollege} userGpa={profile.gpa} />
      )}

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

// ─── Landing Page ─────────────────────────────────────────────────────
function LandingPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="w-full py-4 px-6 lg:px-12 flex items-center justify-between border-b border-border bg-card shadow-sm">
        <div className="flex items-center gap-2">
          <Milestone className="w-5 h-5 text-foreground" />
          <span className="font-display font-bold text-lg tracking-tight text-foreground">Next Steps</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/sign-in")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-full hover:bg-muted">
            Sign in
          </button>
          <button onClick={() => setLocation("/sign-up")} className="text-sm font-semibold bg-primary text-primary-foreground px-5 py-2 rounded-full hover:bg-primary/90 transition-colors">
            Get started
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-muted text-muted-foreground text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          AI-powered college major explorer
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground mb-6 leading-tight max-w-3xl">
          Find the major that's right for you.
        </h1>
        <p className="text-xl text-muted-foreground max-w-xl mb-10 leading-relaxed">
          Take a quick quiz, get personalized major recommendations, and explore the top US universities for any field.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button onClick={() => setLocation("/sign-up")} className="flex items-center gap-2 bg-primary text-primary-foreground text-base font-semibold px-8 py-4 rounded-full hover:bg-primary/90 transition-colors shadow-lg">
            Start for free <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={() => setLocation("/sign-in")} className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors">
            Already have an account →
          </button>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
          {[
            { title: "Personalized quiz", desc: "Answer 5 quick questions to get matched with majors that fit your interests and strengths." },
            { title: "Top 10 colleges", desc: "Instantly see the top US universities for any major, with highlights on what makes each one great." },
            { title: "4-year course plan", desc: "Click any college to see a realistic 4-year course plan tailored to your major." },
          ].map(({ title, desc }) => (
            <div key={title} className="bg-card rounded-2xl border border-border p-6 text-left shadow-sm">
              <h3 className="font-display font-bold text-foreground text-lg mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// ─── Sign-in / Sign-up pages ──────────────────────────────────────────
function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

// ─── Home redirect ────────────────────────────────────────────────────
function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/app" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function AppRoute() {
  return (
    <>
      <Show when="signed-in">
        <AppShell />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

// ─── Cache invalidator ────────────────────────────────────────────────
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

// ─── Clerk Provider + Routes ──────────────────────────────────────────
function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to your Next Steps account" } },
        signUp: { start: { title: "Create your account", subtitle: "Start discovering your perfect major" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/app" component={AppRoute} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
